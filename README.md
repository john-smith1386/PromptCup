# ⚽ Prompt Cup

**A penalty shootout you play while your coding agent works. The whistle blows the second the agent finishes.**

Vibe coding has a dead zone: the 10-seconds-to-12-minutes gap after you send a prompt, where the agent is working and you have nothing to do. You drift to Slack, lose the thread, and miss the moment your agent needs you. Prompt Cup fills that gap with a game that is *aware of your agent* — it only lets you score while the agent is actually working, and it physically interrupts itself the instant work stops.

> Built during the 2026 tournament summer. No FIFA/World Cup branding — generic nations and flags only.
> Works with **Claude Code, OpenAI Codex CLI, Gemini CLI, and GitHub Copilot (CLI + VS Code)** (see [Works with multiple agents](#works-with-multiple-agents)).

### ▶ Watch the trailer

[![Prompt Cup trailer](https://img.youtube.com/vi/hwV5Ib6rKhI/maxresdefault.jpg)](https://youtu.be/hwV5Ib6rKhI)

*60 seconds: the dead zone, the gameplay, and the whistle that ends the match the instant your agent stops.*

---

## Why it's different

Most "things to do while the agent runs" fall into three buckets: productivity advice (just review the diff), tools that remove the wait (parallel agents), and terminal pets that are passive decoration. Prompt Cup is the only one where **the wait is the game** and the game **knows your agent's state**:

- **Hard agent gate** — career goals are scorable *only* while the agent is working. No live agent, no match. The scarcity is the point.
- **Final-whistle interrupt** — the moment the agent finishes (`Stop` hook), the pitch freezes and a full-time banner takes over. You can't miss that it's time to review.
- **Stall watchdog** — if the agent goes silent for 45s (often a permission prompt you didn't see), the game interrupts itself and tells you to go check. It will never fake progress.

---

## Quick start

Requires [Node.js](https://nodejs.org) 18 or newer.

> **Two ways to run the commands below:**
> - **Downloaded the folder?** Use `node bin/cli.js <command>` (on Windows: `node bin\cli.js <command>`). This is the simplest way and needs no install.
> - **Installed globally** with `npm install -g .` from the project folder? Then you can use the short `promptcup <command>` form shown in some examples.
>
> If you see *"promptcup is not recognized"*, you're in the first case — just put `node bin/cli.js` in front.

```bash
git clone https://github.com/john-smith1386/promptcup.git
cd promptcup
node bin/cli.js init     # wires Claude Code hooks into ~/.claude/settings.json (backs it up first)
                         # other agents: init codex | gemini | copilot | copilot-vscode
node bin/cli.js start    # starts the server and opens the game in your browser
```

Then **restart your Claude Code session** (so it loads the new hooks) and submit any prompt. Kickoff.

**Daily use after that is one step:** double-click `Start Prompt Cup.bat` (Windows), `Start Prompt Cup.command` (Mac), or run `./start.sh` (Linux).

New to the terminal? See **[INSTALL.md](INSTALL.md)** for click-by-click setup on Windows, macOS, and Linux.

---

## Works with multiple agents

Prompt Cup speaks four internal events — kickoff, tool, input, whistle — and an adapter maps each agent's native lifecycle hooks onto them. The game itself is identical regardless of agent. Hooks are delivered by a small cross-platform Node forwarder (`bin/forward.js`), so the same setup works on Windows, macOS, and Linux.

```bash
node bin/cli.js init                 # Claude Code (default)
node bin/cli.js init codex           # OpenAI Codex CLI
node bin/cli.js init gemini          # Gemini CLI
node bin/cli.js init copilot         # GitHub Copilot CLI       (run inside each repo)
node bin/cli.js init copilot-vscode  # GitHub Copilot in VS Code (run inside each repo)
```

(On Windows use `node bin\cli.js ...`.)

| Internal event | Claude Code | Codex CLI | Gemini CLI | Copilot CLI | Copilot in VS Code |
|---|---|---|---|---|---|
| **kickoff** | `UserPromptSubmit` | `UserPromptSubmit` | `UserPromptSubmit` | `sessionStart` / `userPromptSubmitted` | `SessionStart` / `UserPromptSubmit` |
| **tool** (commentary) | `PostToolUse` | `PostToolUse` | `AfterTool` | `postToolUse` | `PostToolUse` |
| **input** (ref pause) | `Notification` | `PermissionRequest` | — (watchdog) | — (watchdog) | — (watchdog) |
| **whistle** (full time) | `Stop` | `Stop` | `Stop` | — (watchdog) | `Stop` ✅ |

Each writes to that agent's own config, backing it up first and only ever touching its own entries: `~/.claude/settings.json` (Claude), `~/.codex/hooks.json` (Codex), `~/.gemini/settings.json` (Gemini), and `.github/hooks/promptcup.json` in the current repo (both Copilot surfaces). `node bin/cli.js remove all` cleans every agent. Re-running `init` is safe — it strips any older promptcup hooks (from any version) before writing one clean entry per event.

**Notes per agent:**

- **Claude Code** — fully supported, the reference implementation. After `init`, restart Claude Code (or `/quit` then `claude`) so it loads the hooks.

- **Codex CLI** — hooks are experimental and need two manual steps after `init codex`, because Codex won't let an outside tool enable or trust hooks for you:
  1. **Enable hooks** — add this to `~/.codex/config.toml`:
     ```toml
     [features]
     hooks = true
     ```
     (or run `codex --enable hooks`)
  2. **Trust them** — start Codex, run `/hooks`, and trust the promptcup entries. Each event should then read **Installed: 1, Active: 1**.

  Works on **native Windows** (confirmed) as well as macOS/Linux. Codex's `PermissionRequest` maps cleanly to the ref-pause. If `/hooks` shows more than one promptcup entry per event, run `node bin/cli.js remove all` then `init codex` again to collapse to a single clean hook.

- **Gemini CLI** — event names move between versions; if the lamp never lights, check Gemini's current hook event names against the table above. No clean permission signal, so the watchdog covers it.

- **GitHub Copilot CLI** — install separately with `npm install -g @github/copilot` (needs a **paid** Copilot plan; the free plan can't use the CLI). Hooks are **per-repository**: run `init copilot` from inside the project folder — it writes `.github/hooks/promptcup.json` there, so re-run it in each repo. The CLI has **no finished/needs-input hook**, so the 45-second stall watchdog provides the whistle and permission pauses.

- **GitHub Copilot in VS Code** — the in-editor chat agent, **separate from the CLI** and the better experience because it has a real `Stop` event (instant whistle). Run `init copilot-vscode` **from VS Code's integrated terminal** (Ctrl+\`) so the file lands in the open workspace, then reload the window (Ctrl+Shift+P → *Developer: Reload Window*). It's per-repository, same `.github/hooks/promptcup.json` location. Confirm hooks fire via the **GitHub Copilot Chat Hooks** output channel (View → Output). The single most common mistake: running `init` from the wrong folder — the file must sit in the root of the workspace VS Code has open, not `C:\` or your Downloads. Hooks may require a paid Copilot plan.

Any agent that can run a shell command on its lifecycle events can be added — the forwarder just needs to reach `localhost:4747/hook/{UserPromptSubmit|PostToolUse|Notification|Stop}`.

## How it works

Prompt Cup is a tiny local server plus a browser game. Agent hooks run a small Node forwarder that POSTs lifecycle events to the server, which pushes them to the game over Server-Sent Events.

```
your agent  ──hook──▶  node forward.js  ──HTTP POST──▶  localhost:4747  ──SSE──▶  browser game
```

Each hook runs `node "<path>/forward.js" <event>`. The forwarder reads the hook's JSON on stdin, POSTs it to the game, and **always exits 0**, so a dead game server is a silent no-op and your agent never blocks or reports a failed hook. Using Node rather than a shell one-liner is deliberate: agents run hook commands through different shells per OS (bash on macOS/Linux, PowerShell or cmd on Windows), and a `curl ... || exit 0` string parses differently across them — it fails with "hook exited with code 1" under Codex/Copilot on Windows. Node behaves identically everywhere.

---

## Gameplay

Each round is two kicks: **you shoot, then you keep.** Best of five, sudden death on a tie.

**Your kick.** Aim with the mouse or arrow keys — your aim *sways* (nerves), and the sway grows with the stage, your streak, and clutch moments. Click once to start the power bar, again to shoot:

- under 50% — tame, the keeper holds it
- 50–72% — placed
- **72–90% — the sweet spot, hardest to save**
- over 90% — a blast that drifts toward the woodwork

**Your save.** Roles flip and you're the goalkeeper. The shooter commits to a corner *before* you choose — he never sees your dive. Your edge is reading him: he leans toward his intended side (better teams disguise it more), and from his third kick the ticker shows his corner history this match. Dive with ← ↑ → or click a third of the goal.

**The cup.** Win to advance GROUP → R16 → QF → SF → FINAL. Lose and you replay the stage against a fresh opponent. Win the final for a star that permanently sharpens every future keeper. **Matches suspend at full time and resume at the exact scoreline on your next prompt** — being 3–2 up in a semi when the whistle blows is what pulls you back.

**Friendly mode** is available when no agent is running, clearly badged, with a throwaway score that counts for nothing. A real kickoff ends a friendly instantly.

---

## Playing inside VS Code

No extension required. Start the server, then:

1. Open the Command Palette: **`Ctrl+Shift+P`** (Mac: `Cmd+Shift+P`).
2. Type **Simple Browser: Show** and press Enter.
3. Enter `http://localhost:4747` and press Enter.
4. The game opens as an editor tab. Drag it to a split so Claude is on one side and the pitch on the other.

To have the server start by itself whenever you open your project, copy `.vscode/tasks.example.json` to `.vscode/tasks.json`, fix the path inside, and allow the task when VS Code prompts. See [INSTALL.md](INSTALL.md) for the full snippet.

> **VS Code extension note:** there's a known issue where hooks may not fire from the extension panel in some versions. If the lamp never goes LIVE, use the Claude CLI in the integrated terminal instead (below) — hooks always fire from the CLI. You can test the plumbing any time at `http://localhost:4747/?dev`.

## Playing with the Claude CLI

Yes, this works, and it's the most reliable setup because hooks always fire from the CLI.

1. Run `node bin/cli.js init` once and `node bin/cli.js start` to launch the game.
2. Open a terminal (standalone, or VS Code's integrated terminal with **Ctrl+`**) and run `claude`.
3. Restart the session if it was already open (`/quit`, then `claude` again) so the hooks load.
4. Open `http://localhost:4747` and send a prompt. Kickoff.

Either way the game is identical — the CLI and the VS Code extension share the same `~/.claude/settings.json`, so one `init` covers both.

---

## Commands

| Command | What it does |
|---|---|
| `node bin/cli.js init [claude\|codex\|gemini\|copilot\|copilot-vscode]` | Wire hooks for that agent (default: claude). Idempotent, backs up first. |
| `node bin/cli.js start` | Start the server and open the game. Add `--no-open` to skip the browser. |
| `node bin/cli.js status` | One-line scoreboard for the Claude Code statusline. |
| `node bin/cli.js remove [agent\|all]` | Remove Prompt Cup's hooks (default: all). |

**Optional: the short `promptcup` command.** If you'd rather type `promptcup` instead of `node bin/cli.js`, run `npm install -g .` from the project folder once. After that, `promptcup init`, `promptcup start`, etc. work from anywhere. (Without this, always use the `node bin/cli.js` form.)

**Optional statusline** — show your score inside Claude Code. In `~/.claude/settings.json`:

```json
"statusLine": { "type": "command", "command": "node /full/path/to/promptcup/bin/cli.js status" }
```

---

## Configuration

| What | Where | Default |
|---|---|---|
| Server port | `PORT` in `server.js` | `4747` |
| Stall warning delay | the `45000` in `public/index.html` (watchdog) | 45s |
| Keeper difficulty | `pickKeeper()` read-chance constants in `public/index.html` | — |

Your score and current cup live in the browser's localStorage, not in the repo, so updating the code never resets your progress.

---

## Privacy & safety

- The server binds to `127.0.0.1` only. Nothing is exposed to your network.
- No data leaves your machine. No accounts, no telemetry, no external calls.
- `init` backs up your existing `settings.json` to `settings.json.promptcup.bak` before editing, and only ever touches its own hook entries.

---

## Project layout

```
promptcup/
├── bin/cli.js        # init / start / status / remove
├── bin/forward.js    # cross-platform hook forwarder (stdin -> POST, always exits 0)
├── server.js         # zero-dependency local event server (SSE)
├── public/index.html # the game (canvas + vanilla JS, no build step)
├── INSTALL.md        # beginner setup for Windows / macOS / Linux
└── Start Prompt Cup.*# double-click launchers
```

No build step, no runtime dependencies, Node 18+.

---

## In-game guide

Click the **?** button in the top bar any time for an illustrated how-to-play (it also opens automatically on your first visit).

See [CONTRIBUTING.md](CONTRIBUTING.md) to get involved.

## More from the maker

- **[Joberney](https://joberney.com)** — career & entrepreneurship platform.
- **[KindnessSender](https://kindnesssender.com)** — send a little kindness.
- **[Beadela](https://beadela.com)** — fuse-bead pattern app.

## Support Me and Plan Trees
- ** [PlantYourTip](https://plantyourtip.com/g2FfQQIl5d)** - A platform to donate and plant trees

## License

[MIT](LICENSE) © john-smith1386

Not affiliated with FIFA, any football association, or Anthropic. "Claude" and "Claude Code" are products of Anthropic; this is an independent community project.
