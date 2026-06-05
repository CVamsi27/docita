export function isDependenciesChange(file) {
  return isRootDependencyManifest(file) || isWorkspacePackageManifest(file);
}

export function isKnipChange(file) {
  return (
    isDependenciesChange(file) ||
    file === "knip.json" ||
    file === "turbo.json" ||
    file.startsWith("apps/") ||
    file.startsWith("packages/") ||
    file.startsWith("scripts/")
  );
}

function isRootDependencyManifest(file) {
  return (
    file === "package.json" ||
    file === "pnpm-lock.yaml" ||
    file === "pnpm-workspace.yaml"
  );
}

function isWorkspacePackageManifest(file) {
  return (
    (file.startsWith("apps/") && file.endsWith("/package.json")) ||
    (file.startsWith("packages/") && file.endsWith("/package.json"))
  );
}
