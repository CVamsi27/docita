import fs from "node:fs/promises";
import path from "node:path";

export const TARGET_ROUTES = [
  {
    label: "dashboard",
    candidates: ["/dashboard", "/(protected)/dashboard"],
  },
  {
    label: "patients-list",
    candidates: ["/patients", "/(protected)/patients"],
  },
  {
    label: "patients-detail",
    candidates: ["/patients/[id]", "/(protected)/patients/[id]"],
  },
  {
    label: "appointments",
    candidates: ["/appointments", "/(protected)/appointments"],
  },
  {
    label: "analytics",
    candidates: ["/analytics", "/(protected)/analytics"],
  },
];

export async function readJsonIfExists(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function statSafe(filePath) {
  try {
    return await fs.stat(filePath);
  } catch {
    return null;
  }
}

function resolveRouteFiles(pages, routeCandidates) {
  for (const route of routeCandidates) {
    if (pages[route]) {
      return pages[route];
    }
  }

  const match = Object.keys(pages).find((page) =>
    routeCandidates.some((candidate) => page.includes(candidate)),
  );
  return match ? pages[match] : null;
}

async function resolveAppRouterPageSize(nextDir, routeCandidates) {
  const serverAppRoot = path.join(nextDir, "server", "app");

  for (const candidate of routeCandidates) {
    const normalized = candidate.startsWith("/") ? candidate.slice(1) : candidate;
    const pagePath = path.join(serverAppRoot, normalized, "page.js");
    const stats = await statSafe(pagePath);
    if (stats) {
      return stats.size;
    }
  }

  return null;
}

export async function collectAppRouteBundleSizes(appDir) {
  const nextDir = path.join(appDir, ".next");
  const buildManifestPath = path.join(nextDir, "build-manifest.json");
  const manifest = await readJsonIfExists(buildManifestPath);
  const pages = manifest?.pages ?? {};

  const routeSizes = {};
  for (const targetRoute of TARGET_ROUTES) {
    const files = resolveRouteFiles(pages, targetRoute.candidates);
    if (!files) {
      // Next.js App Router does not populate build-manifest "pages". Fall back
      // to the compiled page entrypoint size as a stable proxy.
      routeSizes[targetRoute.label] = await resolveAppRouterPageSize(
        nextDir,
        targetRoute.candidates,
      );
      continue;
    }

    const dedupedFiles = [...new Set(files)];
    let totalBytes = 0;

    for (const file of dedupedFiles) {
      const filePath = path.join(nextDir, file);
      const stats = await statSafe(filePath);
      if (stats) {
        totalBytes += stats.size;
      }
    }

    routeSizes[targetRoute.label] = totalBytes;
  }

  return {
    appDir,
    buildManifestPath,
    routeSizes,
  };
}

export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) {
    return "n/a";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
