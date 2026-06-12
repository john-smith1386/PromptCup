# Contributing to Prompt Cup

Thanks for taking a look. This is a small, dependency-free project and intends to stay that way.

## Ground rules

- **No runtime dependencies.** The server is plain Node, the game is vanilla JS on a canvas, and there is no build step. Please keep it that way unless there's a strong reason.
- **No FIFA / World Cup / real-club branding.** Generic nations and flag emoji only. This keeps the project legally clean.
- **The agent gate is sacred.** Career goals must only be scorable while the agent is genuinely working. Any change that lets someone farm goals with no live agent will be declined.

## Running it locally

```bash
node bin/cli.js start          # then open http://localhost:4747/?dev
```

The `?dev` query param reveals buttons that simulate the four agent hooks, so you can test the whole flow without Claude Code running. (They open a *real* career match — use Friendly mode for honest practice.)

## Before opening a PR

- Syntax-check: `node --check server.js && node --check bin/cli.js`.
- Extract and check the game script too, e.g. copy the contents of the `<script>` block in `public/index.html` and run `node --check` on it.
- If you add any field to a saved object, add a migration line in the save-loading block of `public/index.html` so existing players don't break on upgrade. This is non-negotiable — a missing migration will freeze the game for anyone upgrading with an in-progress save.
- Test on at least one OS and note which in the PR.

## Ideas worth doing

See the roadmap in the README. Adapters for Cursor/Codex and a hosted leaderboard are the highest-impact next steps.

## Reporting bugs

Open an issue with your OS, Node version, the version shown bottom-right in the game, and any red `promptcup frame error` lines from the browser console (F12).
