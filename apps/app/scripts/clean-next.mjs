import { rmSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nextDir = path.resolve(__dirname, "../.next");

if (existsSync(nextDir)) {
  rmSync(nextDir, { recursive: true, force: true });
}

const openNextDir = path.resolve(__dirname, "../.open-next");
if (existsSync(openNextDir)) {
  rmSync(openNextDir, { recursive: true, force: true });
}
