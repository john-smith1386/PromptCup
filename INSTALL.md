# Installing Prompt Cup, step by step

No experience needed. First get the code (below), then follow your operating system's section.

---

## Get the code

You need [Node.js](https://nodejs.org) 18 or newer for any of these. Pick one:

**Option A — clone with git (recommended):**
```
git clone https://github.com/john-smith1386/promptcup.git
cd promptcup
```

**Option B — download the ZIP (no git needed):**
On the GitHub page, click the green **Code** button → **Download ZIP**, then extract it. You'll get a folder like `promptcup-main`; rename it to `promptcup` if you like. Open a terminal **inside that folder**.

**Option C — run it without installing (once published to npm):**
```
npx promptcup init
npx promptcup start
```
With `npx` you skip the clone entirely and there's no folder to manage. The rest of this guide uses the `node bin/cli.js ...` form for clone/zip users; `npx promptcup ...` is the exact equivalent.

Once you have the folder, find your OS below.

---

## Windows 10 / 11

### Step 1. Check you have Node.js

1. Press the **Windows key**, type `powershell`, press Enter.
2. In the blue window, type this and press Enter:
   ```
   node --version
   ```
3. If you see something like `v20.11.0` (any number 18 or higher), you're good. Skip to Step 2.
4. If you see an error like "node is not recognized": go to https://nodejs.org, download the **LTS** installer, run it, click Next through everything. Then **close PowerShell, open it again**, and repeat the check.

### Step 2. Get the code into a folder you'll remember

Follow **Get the code** above (clone or download ZIP). Then `cd` into the folder, for example:
```
cd C:\Users\YOURNAME\promptcup
```

### Step 3. Wire it into Claude Code

In PowerShell, type these two lines, pressing Enter after each (change the path if you put the folder elsewhere):

```
cd C:\Users\YOURNAME\promptcup
node bin\cli.js init
```

You should see: `promptcup: hooks added to C:\Users\YOURNAME\.claude\settings.json`. It makes a backup of that file automatically before touching it.

### Step 4. Start the game server

In the same window:

```
node bin\cli.js start
```

You should see `promptcup: kickoff at http://localhost:4747`, and the game opens in your browser automatically.
**Leave this window open.** The game only runs while it's open. (To stop it later: Ctrl+C.)

### Step 5. Restart VS Code

Close VS Code completely and open it again (this makes Claude load the new hooks; it only reads them at startup).

### Step 6. Play

1. Open your browser and go to: **http://localhost:4747**
2. You should see **PITCH CLOSED**. That's correct: the pitch only opens while your agent works.
3. In VS Code, give Claude any task. The lamp should flip to **AGENT LIVE** and the match opens.
4. When Claude finishes, the whistle blows. Back to work.

---

## macOS

### Step 1. Check you have Node.js

1. Press **Cmd+Space**, type `terminal`, press Enter.
2. Type:
   ```
   node --version
   ```
3. `v18` or higher → continue. Error → install the **LTS** from https://nodejs.org, then close and reopen Terminal and check again.

### Step 2. Get the code

Follow **Get the code** above (clone or download ZIP), then `cd` into the folder:
```
cd ~/promptcup
```

### Step 3. Wire it into Claude Code

```
node bin/cli.js init
```

Expected: `promptcup: hooks added to /Users/yourname/.claude/settings.json` (backed up first).

### Step 4. Start the game server

```
node bin/cli.js start
```

Expected: `promptcup: kickoff at http://localhost:4747`, and the game opens in your browser automatically. **Leave this Terminal window open** while you play. Ctrl+C stops it.

### Step 5. Restart VS Code (or the Claude Code CLI)

Quit fully (**Cmd+Q**, not just the red dot) and reopen. CLI users: `/quit` and run `claude` again.

### Step 6. Play

Open **http://localhost:4747**, see PITCH CLOSED, send Claude a task, watch the lamp go AGENT LIVE.

---

## Linux

### Step 1. Check you have Node.js

```bash
node --version
```

`v18` or higher → continue. Otherwise install it via your package manager (e.g. `sudo apt install nodejs npm`) or from https://nodejs.org, then re-check.

### Step 2. Get the code

```bash
git clone https://github.com/john-smith1386/promptcup.git
cd promptcup
```
(Or download the ZIP from the GitHub Code button and `cd` into the extracted folder.)

### Step 3. Wire it into Claude Code

```bash
node bin/cli.js init    # writes ~/.claude/settings.json, backup made first
```

### Step 4. Start the game server

```bash
node bin/cli.js start
```

Expected: `promptcup: kickoff at http://localhost:4747`. Leave the terminal open while you play; Ctrl+C stops it. (If the browser doesn't open automatically, open that URL yourself, or run with `--no-open` to skip the attempt.)

### Step 5. Restart your Claude Code session

CLI: `/quit`, then `claude` again. VS Code: close and reopen.

### Step 6. Play

Open **http://localhost:4747**, see PITCH CLOSED, send Claude a task, watch the lamp go AGENT LIVE.

---

## Daily use (after the one-time install)

`init` is **one-time only**. Day to day there is exactly one step:

- **Windows:** double-click **`Start Prompt Cup.bat`** in the promptcup folder.
- **Mac:** double-click **`Start Prompt Cup.command`** (first time: right-click > Open to get past Gatekeeper).
- **Linux:** run `./start.sh`.

That starts the server **and opens the game in your browser automatically**. Minimize the window and play. Ctrl+C or closing the window stops it.

## Playing inside VS Code (no extension needed)

You can dock the game right next to your Claude panel:

1. Start the server (double-click launcher).
2. In VS Code press **Ctrl+Shift+P** (Mac: Cmd+Shift+P), type **Simple Browser: Show**, press Enter.
3. Enter `http://localhost:4747` and press Enter.
4. The game opens as an editor tab. Drag it to a split so Claude is on one side and the pitch on the other.

### Optional: auto-start the server when you open your project

Create `.vscode/tasks.json` in your project with:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "promptcup",
      "type": "shell",
      "command": "node",
      "args": ["bin/cli.js", "start", "--no-open"],
      "options": { "cwd": "C:/Users/YOURNAME/promptcup" },
      "isBackground": true,
      "runOptions": { "runOn": "folderOpen" },
      "presentation": { "reveal": "never" }
    }
  ]
}
```

(Fix the `cwd` path for your machine; Mac/Linux use e.g. `"/Users/yourname/promptcup"`.) Allow the task when VS Code asks. From then on the server starts silently whenever you open that project, and the game is always waiting at localhost:4747.


---

## Using a different agent (Codex, Gemini, Copilot)

Prompt Cup defaults to Claude Code, but the same game works with other agents. Run `init` with the agent name (Windows users: `node bin\\cli.js ...`):

```
node bin/cli.js init claude          # Claude Code (default, same as `init`)
node bin/cli.js init codex           # OpenAI Codex CLI
node bin/cli.js init gemini          # Gemini CLI
node bin/cli.js init copilot         # GitHub Copilot CLI        (per-repo)
node bin/cli.js init copilot-vscode  # GitHub Copilot in VS Code (per-repo)
```

Then `node bin/cli.js start` and play. `node bin/cli.js remove all` removes Prompt Cup from every agent at once. Re-running `init` is always safe — it cleans out any old promptcup hooks before writing one fresh entry per event.

### Codex CLI

Two manual steps are required after `init codex`, because Codex won't let another program enable or trust hooks for you:

1. **Enable hooks.** Add this to `~/.codex/config.toml` (Windows: `%USERPROFILE%\\.codex\\config.toml`):
   ```toml
   [features]
   hooks = true
   ```
   (or run `codex --enable hooks`)
2. **Trust them.** Start Codex, run `/hooks`, and trust the promptcup entries. Each event should show **Installed: 1, Active: 1**.

Works on **native Windows** as well as macOS/Linux. If `/hooks` shows more than one promptcup entry per event (from upgrading across versions), run `node bin/cli.js remove all` then `init codex` again.

### Gemini CLI

Gemini's hook event names change between versions. If the lamp never turns LIVE, your version may use different names; check the table in the README. Gemini has no clean "needs permission" hook, so the stall watchdog covers that case.

### GitHub Copilot CLI

First install it: `npm install -g @github/copilot` (needs a **paid** Copilot plan — the free plan can't use the CLI). Hooks are **per-repository**: run `init copilot` from inside the project folder so the `.github/hooks/promptcup.json` file lands there. The CLI has no finished/needs-input hook, so the stall watchdog provides the whistle and permission pauses.

### GitHub Copilot in VS Code (recommended Copilot option)

This is the in-editor Copilot Chat agent — **not the same as the CLI** — and it's the better experience because it has a real `Stop` event, so the whistle fires instantly. Steps:

1. Open your project folder in VS Code.
2. Open the **integrated terminal** (Ctrl+\`). This is important — it opens in your workspace folder, which is where the hook file must live.
3. **Check the prompt shows your project path**, not `C:\\>`. Then run:
   ```
   node C:\\path\\to\\promptcup\\bin\\cli.js init copilot-vscode
   ```
4. Confirm it landed in the workspace: `type .github\\hooks\\promptcup.json` (the prompt must still show your project folder).
5. Reload VS Code: Ctrl+Shift+P → **Developer: Reload Window**.
6. Start the game (`node bin\\cli.js start` from the promptcup folder), open localhost:4747, and send a Copilot Chat prompt.

To verify hooks are firing, open **View → Output** and pick the **GitHub Copilot Chat Hooks** channel. The #1 mistake is running `init` from the wrong folder — the file must be in the root of the workspace VS Code has open. Hooks may require a paid Copilot plan.

You can run more than one agent at once — each writes to its own config and they don't conflict. The game shows whichever agent is currently active.


---

## Troubleshooting

### "I still see the old version"

Three things, in order:

1. **Kill the old server.** If a previous `node bin/cli.js start` is still running in some forgotten window, you're being served old files from the old folder. Close every terminal window running it (or Ctrl+C in each), make sure you `cd` into the **new** promptcup folder, and run `node bin/cli.js start` again.
2. **Hard-refresh the browser.** Windows/Linux: **Ctrl+Shift+R**. Mac: **Cmd+Shift+R**.
3. **Check the version label.** Bottom-right of the game page shows the version. If it's behind, you're still on old files: `git pull` in the repo (or re-download), make sure you started the server from the updated folder, and hard-refresh.

### The lamp never goes AGENT LIVE when Claude works

- Did you restart VS Code / the CLI **after** running `init`? Hooks only load at session start.
- VS Code extension users: there's a known issue where hooks may not fire from the extension panel. The reliable fallback keeps you in VS Code: open the integrated terminal (**Ctrl+`**), run `claude`, and use Claude there. Hooks always fire from the CLI.
- Test the plumbing without Claude: open **http://localhost:4747/?dev** and click the dev `kickoff` button. If the lamp goes live, the game is fine and the issue is the hooks/restart side.

### "node is not recognized" right after installing Node

Close the terminal/PowerShell window and open a new one. The installer updates your PATH, but already-open windows don't see it.

### Port 4747 already in use

An old server is still running. Close it (find the terminal window running it, Ctrl+C), then start again.

### Uninstall

```
node bin/cli.js remove all
```

(`bin\cli.js` on Windows.) This removes only promptcup's hook entries; a backup of your original settings also lives at `~/.claude/settings.json.promptcup.bak`.
