import { rmSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nextDir = path.resolve(__dirname, "../.next");

if (existsSync(nextDir)) {
  rmSync(nextDir, { recursive: true, force: true });
}

// Skip deleting .open-next when running inside the OpenNext Cloudflare build,
// since OpenNext writes config files there before invoking next build.
const openNextDir = path.resolve(__dirname, "../.open-next");
if (existsSync(openNextDir) && process.env.DOCITA_CLOUDFLARE !== "1") {
  rmSync(openNextDir, { recursive: true, force: true });
}
