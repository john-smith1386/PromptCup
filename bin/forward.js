#!/usr/bin/env node
/**
 * promptcup hook forwarder
 *
 * Invoked by an agent's lifecycle hook. Reads the hook's JSON from stdin and
 * POSTs it to the local game server. ALWAYS exits 0 so a missing/dead server
 * never makes the agent think the hook failed.
 *
 * Usage (set by `promptcup init`):  node forward.js <eventName>
 *
 * Why a Node script instead of a curl one-liner: agents run hook commands
 * through different shells per OS (bash on macOS/Linux, PowerShell or cmd on
 * Windows). A curl + "|| exit 0" string parses differently across them and
 * fails with exit code 1 on Windows. Node is already required to run promptcup
 * and behaves identically everywhere.
 */

import http from "node:http";

const PORT = Number(process.env.PROMPTCUP_PORT) || 4747;
const event = process.argv[2] || "Stop";

// Never hang the agent: hard cap the whole thing.
const HARD_EXIT_MS = 1500;
const killer = setTimeout(() => process.exit(0), HARD_EXIT_MS);
killer.unref();

let body = "";
process.stdin.on("data", (c) => { body += c; if (body.length > 256 * 1024) process.stdin.destroy(); });
process.stdin.on("error", () => done());
process.stdin.on("end", () => {
  const data = body || "{}";
  const req = http.request(
    { host: "127.0.0.1", port: PORT, path: "/hook/" + encodeURIComponent(event), method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }, timeout: 1000 },
    (res) => { res.resume(); res.on("end", done); }
  );
  req.on("error", done);   // server down -> silent success
  req.on("timeout", () => { req.destroy(); done(); });
  req.write(data);
  req.end();
});

// If no stdin arrives at all, still fire after a tick.
setTimeout(() => { if (!body) { try { process.stdin.destroy(); } catch {} } }, 200).unref();

function done() { clearTimeout(killer); process.exit(0); }
