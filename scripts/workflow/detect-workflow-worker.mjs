import { isSharedApiChange } from "./detect-workflow-api-base.mjs";

export function isWorkerChange(file) {
  return (
    isSharedApiChange(file) ||
    file.startsWith("apps/api/") ||
    isWorkerSpecificChange(file)
  );
}

export function isWorkerSpecificChange(file) {
  return (
    file === "apps/worker/fly.toml" ||
    file === "apps/worker/Dockerfile" ||
    file === "apps/api/Dockerfile" ||
    file === "packages/typescript-config/nestjs.json" ||
    file.startsWith("apps/worker/") ||
    file === "apps/api/src/worker.module.ts"
  );
}
