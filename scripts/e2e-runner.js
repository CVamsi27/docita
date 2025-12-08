#!/usr/bin/env node
const { spawn } = require("child_process");
const net = require("net");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..");
const APP_DIR = path.join(REPO_ROOT, "apps", "app");
const API_DIR = path.join(REPO_ROOT, "apps", "api");

function waitForPort(port, host = "127.0.0.1", timeout = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.connect(port, host);
      socket.on("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.on("error", () => {
        socket.destroy();
        if (Date.now() - start > timeout)
          return reject(new Error("Timeout waiting for port " + port));
        setTimeout(tryConnect, 200);
      });
    };
    tryConnect();
  });
}

console.log("Starting API and frontend for full e2e run...");

const apiProc = spawn("pnpm", ["--filter", "@docita/api", "run", "dev"], {
  cwd: REPO_ROOT,
  stdio: "inherit",
  env: process.env,
});

const appProc = spawn("pnpm", ["--filter", "@docita/app", "run", "dev"], {
  cwd: REPO_ROOT,
  stdio: "inherit",
  env: process.env,
});

let finished = false;

function shutdown(code = 0) {
  if (finished) return;
  finished = true;
  console.log("\nShutting down processes...");
  try {
    apiProc.kill("SIGINT");
  } catch (e) {}
  try {
    appProc.kill("SIGINT");
  } catch (e) {}
  process.exit(code);
}

apiProc.on("exit", (code) => {
  if (!finished) console.error("API process exited with", code);
});
appProc.on("exit", (code) => {
  if (!finished) console.error("App process exited with", code);
});

(async () => {
  try {
    await waitForPort(3001, "127.0.0.1", 30000);
    console.log("API listening on 3001");
    await waitForPort(3000, "127.0.0.1", 30000);
    console.log("Frontend listening on 3000");

    // Run Playwright tests in app
    const testProc = spawn("pnpm", ["exec", "playwright", "test", "e2e/"], {
      cwd: APP_DIR,
      stdio: "inherit",
      env: { ...process.env },
    });

    testProc.on("exit", (code) => {
      shutdown(code || 0);
    });
  } catch (err) {
    console.error("Error waiting for services:", err.message || err);
    shutdown(1);
  }
})();
