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
console.log("Press Ctrl+C to stop.");

// Force IPv4 for reliable local connection
const ENV_VARS = {
    ...process.env,
    API_URL: "http://127.0.0.1:3001/api",
    NEXT_PUBLIC_API_URL: "http://127.0.0.1:3001/api",
};

// Use detached: false (default), but maybe we need to be careful with pnpm.
// A common issue is pnpm spawning children and not passing signals.
// We'll stick to default for now but ensure we catch SIGINT.

const apiProc = spawn("pnpm", ["--filter", "@docita/api", "run", "dev"], {
  cwd: REPO_ROOT,
  stdio: "inherit",
  env: ENV_VARS,
});

const appProc = spawn("pnpm", ["--filter", "@docita/app", "run", "dev"], {
  cwd: REPO_ROOT,
  stdio: "inherit",
  env: ENV_VARS,
});

let testProc;
let finished = false;

function shutdown(code = 0) {
  if (finished) return;
  finished = true;
  console.log("\nShutting down processes...");

  const killProc = (proc, name) => {
    if (proc && !proc.killed) {
      console.log(`Killing ${name}...`);
      // Try SIGINT first (graceful)
      proc.kill("SIGINT");
      
      // Force kill if it doesn't exit quickly?
      // Since we don't have tree-kill, we rely on pnpm handling this.
      // If needed, user can manually pkill/killAll.
    }
  };

  killProc(testProc, "Test Runner");
  killProc(apiProc, "API");
  killProc(appProc, "App");

  // Aggressively kill ports to ensure no zombies
  try {
    const killPorts = require('./kill-ports');
    killPorts();
  } catch (e) {
    console.error('Failed to run kill-ports:', e);
  }

  // Give them a moment to cleanup, then hard exit
  setTimeout(() => {
    process.exit(code);
  }, 1000).unref();
}

// Handle signals from user (Ctrl+C)
process.on("SIGINT", () => {
  console.log("\nReceived SIGINT (Ctrl+C). Exiting...");
  shutdown(130);
});

process.on("SIGTERM", () => {
  console.log("\nReceived SIGTERM. Exiting...");
  shutdown(143);
});

apiProc.on("exit", (code) => {
  if (!finished) console.error("API process exited unexpectedly with code", code);
  // Don't necessarily shutdown immediately if dev server restarts, 
  // but for CI/test runner usually bad.
  // shutdown(code || 1); // Optional: decide if API death kills everything
});

appProc.on("exit", (code) => {
  if (!finished) console.error("App process exited unexpectedly with code", code);
});

(async () => {
  try {
    await waitForPort(3001, "127.0.0.1", 120000);
    console.log("API listening on 3001");
    await waitForPort(3000, "127.0.0.1", 120000);
    console.log("Frontend listening on 3000");

    // Run Playwright tests in app
    const args = process.argv.slice(2);
    const testArgs = args.length > 0 ? args : ["e2e/"];
    
    testProc = spawn("pnpm", ["exec", "playwright", "test", ...testArgs], {
      cwd: APP_DIR,
      stdio: "inherit",
      env: ENV_VARS,
    });

    testProc.on("exit", (code) => {
      console.log("Test runner completed with exit code", code);
      shutdown(code || 0);
    });
  } catch (err) {
    console.error("Error waiting for services:", err.message || err);
    shutdown(1);
  }
})();
