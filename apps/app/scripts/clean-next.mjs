import { rmSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nextDir = path.resolve(__dirname, "../.next");
const ifProduction = process.argv.includes("--if-production");

// In --if-production mode, only clean when .next contains a production build
// (detected by the presence of the standalone output directory).
const shouldClean = !ifProduction || existsSync(path.join(nextDir, "standalone"));

if (shouldClean && existsSync(nextDir)) {
  try {
    rmSync(nextDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
  } catch {
    // Best-effort cleanup: build can still proceed with an existing .next
  }
}

const openNextDir = path.resolve(__dirname, "../.open-next");
if (existsSync(openNextDir) && process.env.DOCITA_CLOUDFLARE !== "1") {
  try {
    rmSync(openNextDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
  } catch {
    // Best-effort cleanup
  }
}
