/**
 * promptcup event server (zero dependencies, Node 18+)
 *
 *   GET  /            the game
 *   GET  /events      SSE stream of agent events
 *   POST /hook/:event receives Claude Code hook payloads (stdin JSON forwarded by curl)
 *   POST /score       game client persists score for the statusline
 *   POST /demo/:event fire a fake event (testing without Claude Code)
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

export const PORT = 4747;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const STATE_DIR = path.join(os.homedir(), ".promptcup");
const STATE_PATH = path.join(STATE_DIR, "state.json");

const VALID_EVENTS = new Set(["UserPromptSubmit", "PostToolUse", "Notification", "Stop"]);

/** @type {Set<http.ServerResponse>} */
const clients = new Set();

function broadcast(event, payload) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(payload || {})}\n\n`;
  for (const res of clients) {
    try {
      res.write(msg);
    } catch {
      clients.delete(res);
    }
  }
  // mirror agent phase into the statusline state file
  const phase =
    event === "UserPromptSubmit" ? "working" :
    event === "Notification" ? "input" :
    event === "Stop" ? "done" : null;
  if (phase) patchState({ agentPhase: phase });
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function patchState(patch) {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(STATE_PATH, JSON.stringify({ ...readState(), ...patch }));
  } catch {
    /* statusline is best-effort */
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => {
      body += c;
      if (body.length > 256 * 1024) req.destroy(); // hooks are small; cap it
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".ico": "image/x-icon" };

function serveStatic(req, res) {
  const urlPath = req.url.split("?")[0];
  const rel = urlPath === "/" ? "index.html" : urlPath.slice(1);
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end();
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  });
}

export function startServer() {
  const server = http.createServer(async (req, res) => {
    // Local game only; block cross-origin browser calls.
    res.setHeader("Access-Control-Allow-Origin", `http://localhost:${PORT}`);

    if (req.method === "GET" && req.url === "/events") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.write(`event: hello\ndata: ${JSON.stringify(readState())}\n\n`);
      clients.add(res);
      const ping = setInterval(() => {
        try {
          res.write(": ping\n\n");
        } catch {
          clearInterval(ping);
        }
      }, 25000);
      req.on("close", () => {
        clearInterval(ping);
        clients.delete(res);
      });
      return;
    }

    if (req.method === "POST" && (req.url.startsWith("/hook/") || req.url.startsWith("/demo/"))) {
      const event = req.url.split("/")[2];
      if (!VALID_EVENTS.has(event)) {
        res.writeHead(400).end("unknown event");
        return;
      }
      const payload = await readBody(req);
      broadcast(event, summarize(event, payload));
      res.writeHead(200).end("ok");
      return;
    }

    if (req.method === "POST" && req.url === "/score") {
      const body = await readBody(req);
      patchState({
        goals: body.goals | 0,
        kicks: body.kicks | 0,
        streak: body.streak | 0,
        flag: typeof body.flag === "string" ? body.flag.slice(0, 8) : "⚽",
      });
      res.writeHead(200).end("ok");
      return;
    }

    if (req.method === "GET") {
      serveStatic(req, res);
      return;
    }

    res.writeHead(405).end();
  });

  server.listen(PORT, "127.0.0.1", () => {
    console.log(`promptcup: kickoff at http://localhost:${PORT}`);
    console.log(`promptcup: (if localhost won't open, use http://127.0.0.1:${PORT})`);
    console.log(`promptcup: waiting for agent events on /hook/{${[...VALID_EVENTS].join(",")}}`);
  });

  // Also listen on IPv6 loopback: on some Windows setups "localhost"
  // resolves to ::1 first. Best-effort; skipped if IPv6 is unavailable.
  try {
    const server6 = http.createServer(server.listeners("request")[0]);
    server6.on("error", () => {});
    server6.listen(PORT, "::1");
  } catch {
    /* IPv4 only */
  }

  return server;
}

/** Trim hook payloads down to what the commentary ticker needs. */
function summarize(event, payload) {
  if (event === "PostToolUse") {
    return {
      tool: payload.tool_name || payload.toolName || "tool",
      ok: !(payload.tool_response && payload.tool_response.is_error),
    };
  }
  if (event === "UserPromptSubmit") {
    const p = typeof payload.prompt === "string" ? payload.prompt : "";
    return { prompt: p.slice(0, 80) };
  }
  if (event === "Notification") {
    return { message: typeof payload.message === "string" ? payload.message.slice(0, 120) : "" };
  }
  return {};
}

// `node server.js` runs it directly too
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  startServer();
}
