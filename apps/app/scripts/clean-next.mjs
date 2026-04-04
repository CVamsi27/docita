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
  rmSync(nextDir, { recursive: true, force: true });
}

const openNextDir = path.resolve(__dirname, "../.open-next");
if (existsSync(openNextDir) && process.env.DOCITA_CLOUDFLARE !== "1") {
  rmSync(openNextDir, { recursive: true, force: true });
}
