export function isApiChange(file) {
  return (
    isSharedApiChange(file) ||
    file.startsWith("apps/api/") ||
    file.startsWith("packages/auth/")
  );
}

export function isDbChange(file) {
  return (
    isSharedApiChange(file) ||
    file.startsWith("apps/api/") ||
    file.startsWith("packages/auth/")
  );
}

export function isSharedApiChange(file) {
  return (
    isSharedApiRootChange(file) ||
    file.startsWith("packages/db/") ||
    file.startsWith("packages/types/") ||
    file.startsWith("packages/utils/")
  );
}

function isSharedApiRootChange(file) {
  return (
    file === "package.json" ||
    file === "pnpm-lock.yaml" ||
    file === "pnpm-workspace.yaml" ||
    file === "turbo.json" ||
    file === "fly.toml"
  );
}
