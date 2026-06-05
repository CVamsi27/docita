import { isApiChange } from "./detect-workflow-api-base.mjs";
import { isWorkerSpecificChange } from "./detect-workflow-worker.mjs";

export function isDeployApiChange(file) {
  return (
    isApiChange(file) ||
    isFlyDeployChange(file) ||
    file === "scripts/deploy/test-api-startup.sh"
  );
}

export function isDeployWorkerChange(file) {
  return (
    isApiChange(file) || isWorkerSpecificChange(file) || isFlyDeployChange(file)
  );
}

function isFlyDeployChange(file) {
  return (
    file === ".github/workflows/deploy.yml" ||
    file === "scripts/workflow/detect-workflow-scope.mjs" ||
    file === "scripts/deploy/fly-deploy-in-primary-region.sh"
  );
}
