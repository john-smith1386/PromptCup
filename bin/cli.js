#!/usr/bin/env node
/**
 * promptcup CLI — multi-agent
 *
 *   promptcup init [claude|codex|gemini|copilot|copilot-vscode]   wire hooks for that agent (default: claude)
 *   promptcup start                        run the game server at http://localhost:4747
 *   promptcup status                       one-line scoreboard for a statusline
 *   promptcup remove [claude|codex|gemini|all]   remove promptcup hooks (default: all)
 *
 * The game speaks four internal events: UserPromptSubmit, PostToolUse,
 * Notification, Stop. Each agent adapter maps that agent's native lifecycle
 * events onto these four endpoints, so the browser game never changes.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { startServer, PORT } from "../server.js";

import { fileURLToPath } from "node:url";

const HOME = os.homedir();
const STATE_DIR = path.join(HOME, ".promptcup");
const STATE_PATH = path.join(STATE_DIR, "state.json");

const IS_WIN = process.platform === "win32";

// Absolute path to the forwarder, with backslashes escaped for JSON config.
const FORWARD = fileURLToPath(new URL("./forward.js", import.meta.url));

/* The hook runs:  node "<abs>/forward.js" <event>
   forward.js reads stdin and POSTs to the game, always exiting 0. Using Node
   (not a curl/bash one-liner) means the same command works in bash, PowerShell,
   and cmd — the curl form failed with exit code 1 under Codex on Windows. */
function hookCommand(internal) {
  return `node "${FORWARD}" ${internal}`;
}

function openBrowser(url) {
  try {
    const cmd = IS_WIN ? ["cmd", "/c", "start", "", url]
      : process.platform === "darwin" ? ["open", url]
      : ["xdg-open", url];
    spawn(cmd[0], cmd.slice(1), { detached: true, stdio: "ignore" }).unref();
  } catch { /* user can open it manually */ }
}

/* ---------------- adapters ----------------
   Each maps native agent events -> our internal endpoint name.
   The mapping value is the /hook/<name> the game listens on.            */
const ADAPTERS = {
  claude: {
    label: "Claude Code",
    settingsPath: path.join(HOME, ".claude", "settings.json"),
    restartHint: "Restart Claude Code (or run /quit then `claude`) so the hooks load.",
    // native event -> internal endpoint
    map: { UserPromptSubmit: "UserPromptSubmit", PostToolUse: "PostToolUse", Notification: "Notification", Stop: "Stop" },
    write: writeClaude, clear: clearClaude,
  },
  codex: {
    label: "Codex CLI",
    settingsPath: path.join(HOME, ".codex", "hooks.json"),
    restartHint: "Codex hooks are experimental: enable [features].hooks = true and trust the file via /hooks, then restart Codex. Not supported on Windows yet.",
    // Codex uses PermissionRequest where Claude uses Notification
    map: { UserPromptSubmit: "UserPromptSubmit", PostToolUse: "PostToolUse", PermissionRequest: "Notification", Stop: "Stop" },
    write: writeCodex, clear: clearCodex,
  },
  gemini: {
    label: "Gemini CLI",
    settingsPath: path.join(HOME, ".gemini", "settings.json"),
    restartHint: "Restart Gemini CLI so the hooks load. Event names vary by version — see README if the lamp doesn't light up.",
    // Gemini's closest equivalents; permission signal falls back to the watchdog
    map: { AfterTool: "PostToolUse", Stop: "Stop", UserPromptSubmit: "UserPromptSubmit" },
    write: writeGemini, clear: clearGemini,
  },
  copilot: {
    label: "GitHub Copilot CLI",
    // Copilot hooks are REPO-scoped: .github/hooks/promptcup.json in the current project
    settingsPath: path.join(process.cwd(), ".github", "hooks", "promptcup.json"),
    restartHint: "Restart Copilot CLI in THIS repo so the hooks load. This config is per-repo — re-run `init copilot` in each project. Copilot CLI has no Stop/Notification hook yet, so the 45s stall watchdog handles full-time and permission pauses.",
    map: { sessionStart: "UserPromptSubmit", userPromptSubmitted: "UserPromptSubmit", postToolUse: "PostToolUse" },
    write: writeCopilot, clear: clearCopilot,
    repoScoped: true,
  },
  "copilot-vscode": {
    label: "GitHub Copilot in VS Code",
    // Same .github/hooks/ location, but VS Code uses PascalCase event names AND has a real Stop event
    settingsPath: path.join(process.cwd(), ".github", "hooks", "promptcup.json"),
    restartHint: "Reload VS Code (Ctrl+Shift+P -> Developer: Reload Window) so the hooks load. Per-repo — re-run in each project. Needs VS Code (Insiders for preview) with the GitHub Copilot Chat extension. VS Code Copilot HAS a Stop event, so you get an instant whistle.",
    map: { SessionStart: "UserPromptSubmit", UserPromptSubmit: "UserPromptSubmit", PostToolUse: "PostToolUse", Stop: "Stop" },
    write: writeCopilot, clear: clearCopilot,
    repoScoped: true,
  },
};

/* Recognize ANY promptcup hook we've ever written, across versions:
   - new form: command contains "forward.js"
   - old curl forms: command contains "/hook/" pointing at our port
   and across both shapes: flat {type,command} or nested {hooks:[{command}]}. */
function cmdIsOurs(c) {
  return typeof c === "string" && (c.includes("forward.js") || c.includes(`localhost:${PORT}/hook/`));
}
function entryIsOurs(entry) {
  if (!entry) return false;
  if (cmdIsOurs(entry.command)) return true;                          // flat shape
  if (Array.isArray(entry.hooks)) return entry.hooks.some((h) => cmdIsOurs(h && h.command)); // nested shape
  return false;
}
const isOurs = (h) => cmdIsOurs(h && h.command);   // kept for the inner-array filters

/* ---- Claude / Gemini share the JSON settings.hooks[event] = [{hooks:[...]}] shape ---- */
function readJson(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return {}; } }
function backupAndWrite(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  if (fs.existsSync(p)) fs.copyFileSync(p, p + ".promptcup.bak");
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
}
function writeJsonHooks(p, map) {
  const s = readJson(p);
  s.hooks = s.hooks || {};
  for (const [native, internal] of Object.entries(map)) {
    const list = (Array.isArray(s.hooks[native]) ? s.hooks[native] : []).filter((e) => !entryIsOurs(e));
    list.push({ hooks: [{ type: "command", command: hookCommand(internal) }] });
    s.hooks[native] = list;
  }
  backupAndWrite(p, s);
}
function clearJsonHooks(p, map) {
  const s = readJson(p);
  if (!s.hooks) return false;
  for (const native of Object.keys(map)) {
    if (Array.isArray(s.hooks[native])) {
      s.hooks[native] = s.hooks[native].filter((e) => !entryIsOurs(e));
      if (!s.hooks[native].length) delete s.hooks[native];
    }
  }
  backupAndWrite(p, s);
  return true;
}
function writeClaude(a) { writeJsonHooks(a.settingsPath, a.map); }
function clearClaude(a) { return clearJsonHooks(a.settingsPath, a.map); }
function writeGemini(a) { writeJsonHooks(a.settingsPath, a.map); }
function clearGemini(a) { return clearJsonHooks(a.settingsPath, a.map); }

/* ---- Copilot uses .github/hooks/<name>.json: { hooks: { event: [{type,command}] } } ---- */
function writeCopilot(a) {
  const s = readJson(a.settingsPath);
  s.hooks = s.hooks || {};
  for (const [native, internal] of Object.entries(a.map)) {
    const list = (Array.isArray(s.hooks[native]) ? s.hooks[native] : []).filter((e) => !entryIsOurs(e));
    list.push({ type: "command", command: hookCommand(internal) });
    s.hooks[native] = list;
  }
  backupAndWrite(a.settingsPath, s);
}
function clearCopilot(a) {
  const s = readJson(a.settingsPath);
  if (!s.hooks) return false;
  for (const native of Object.keys(a.map)) {
    if (Array.isArray(s.hooks[native])) {
      s.hooks[native] = s.hooks[native].filter((e) => !entryIsOurs(e));
      if (!s.hooks[native].length) delete s.hooks[native];
    }
  }
  backupAndWrite(a.settingsPath, s);
  return true;
}

/* ---- Codex hooks.json: { hooks: { Event: [ { hooks: [ {type,command} ] } ] } }
   Same nested shape as Claude, NOT a flat array. This was the v0.8 bug. ---- */
function writeCodex(a) {
  const s = readJson(a.settingsPath);
  s.hooks = s.hooks || {};
  for (const [native, internal] of Object.entries(a.map)) {
    const list = (Array.isArray(s.hooks[native]) ? s.hooks[native] : [])
      .filter((entry) => !entryIsOurs(entry));
    list.push({ hooks: [{ type: "command", command: hookCommand(internal) }] });
    s.hooks[native] = list;
  }
  backupAndWrite(a.settingsPath, s);
}
function clearCodex(a) {
  const s = readJson(a.settingsPath);
  if (!s.hooks) return false;
  for (const native of Object.keys(a.map)) {
    if (Array.isArray(s.hooks[native])) {
      s.hooks[native] = s.hooks[native].filter((entry) => !entryIsOurs(entry));
      if (!s.hooks[native].length) delete s.hooks[native];
    }
  }
  backupAndWrite(a.settingsPath, s);
  return true;
}

/* ---------------- commands ---------------- */
function init(which) {
  const key = (which || "claude").toLowerCase();
  const a = ADAPTERS[key];
  if (!a) { console.log(`promptcup: unknown agent "${which}". Use: claude | codex | gemini | copilot | copilot-vscode`); process.exit(1); }
  if (key === "codex" && IS_WIN) {
    console.log("promptcup: heads-up — Codex historically disabled hooks on Windows.");
    console.log("Codex shipped native Windows support in May 2026, but hook support there may still be partial.");
    console.log("Writing the config anyway so you can try. If the lamp never goes LIVE, run Codex under WSL instead.");
    console.log("");
  }
  a.write(a);
  console.log(`promptcup: ${a.label} hooks written to ${a.settingsPath}`);
  console.log(`promptcup: backup at ${a.settingsPath}.promptcup.bak`);
  if (key === "claude") {
    console.log("");
    console.log("Optional statusline (shows your score inside Claude Code):");
    console.log('  "statusLine": { "type": "command", "command": "promptcup status" }');
    console.log("");
    console.log("Now run:  promptcup start");
    console.log(a.restartHint);
  } else if (key === "codex") {
    console.log("");
    console.log("Codex needs TWO manual steps that no tool can do for you (security):");
    console.log("  1. Enable hooks. Add to ~/.codex/config.toml:");
    console.log("         [features]");
    console.log("         hooks = true");
    console.log("     (or run:  codex --enable hooks)");
    console.log("  2. Trust the hooks. Start Codex, run /hooks, and trust the promptcup entries.");
    console.log("");
    console.log("Then run:  promptcup start");
  } else if (key === "copilot") {
    console.log("");
    console.log("Copilot CLI hooks are PER-REPO. This wrote into the current folder's .github/hooks/.");
    console.log("Re-run `init copilot` inside each project where you want the game.");
    console.log("Copilot CLI has no 'finished' or 'needs input' hook yet, so the 45s stall");
    console.log("watchdog covers full-time and permission pauses automatically.");
    console.log("");
    console.log("Then run:  promptcup start  (and restart Copilot CLI in this repo)");
  } else if (key === "copilot-vscode") {
    console.log("");
    console.log("VS Code Copilot hooks are PER-REPO. This wrote into the current folder's .github/hooks/.");
    console.log("Re-run inside each project where you want the game.");
    console.log("Requirements: VS Code (Insiders for the preview) with the GitHub Copilot Chat extension.");
    console.log("VS Code Copilot HAS a Stop event, so the whistle fires instantly (no waiting on the watchdog).");
    console.log("");
    console.log("Then run:  promptcup start");
    console.log("Reload VS Code: Ctrl+Shift+P -> 'Developer: Reload Window' so the hooks load.");
    console.log("Verify: in VS Code, open the 'GitHub Copilot Chat Hooks' output channel to see hooks fire.");
  } else {
    console.log("");
    console.log("Now run:  promptcup start");
    console.log(a.restartHint);
  }
}

function remove(which) {
  const key = (which || "all").toLowerCase();
  const keys = key === "all" ? Object.keys(ADAPTERS) : [key];
  if (key !== "all" && !ADAPTERS[key]) { console.log(`promptcup: unknown agent "${which}".`); process.exit(1); }
  let any = false;
  for (const k of keys) {
    const a = ADAPTERS[k];
    if (fs.existsSync(a.settingsPath) && a.clear(a)) { console.log(`promptcup: ${a.label} hooks removed.`); any = true; }
  }
  if (!any) console.log("promptcup: nothing to remove.");
}

function status() {
  try {
    const s = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const flag = s.flag || "⚽";
    const phase = s.agentPhase === "working" ? "▶ LIVE" : s.agentPhase === "input" ? "⏸ REF" : "FT";
    process.stdout.write(`${flag} ${s.goals ?? 0}⚽/${s.kicks ?? 0} streak ${s.streak ?? 0} | ${phase}`);
  } catch {
    process.stdout.write("⚽ promptcup: no match yet");
  }
}

const cmd = process.argv[2] || "start";
const arg = process.argv[3];
if (cmd === "init") init(arg);
else if (cmd === "remove") remove(arg);
else if (cmd === "status") status();
else if (cmd === "start") {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  startServer();
  if (!process.argv.includes("--no-open")) setTimeout(() => openBrowser(`http://localhost:${PORT}`), 600);
} else {
  console.log("usage: promptcup [init [claude|codex|gemini|copilot|copilot-vscode] | start | status | remove [agent|all]]");
  process.exit(1);
}
