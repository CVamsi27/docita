import fs from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

/**
 * Shared chunks loaded on every route (Vite `manualChunks` + entry + common
 * lazy libs). These form the fixed first-load cost of the SPA; route-specific
 * chunks (named after their source module) add on top.
 *
 * MAINTENANCE: this list is a snapshot of the current `manualChunks` rules and
 * lazy-import names in `apps/app`. When a manualChunks rule or a lazy
 * route module is renamed/added, update BOTH this list and `TRACKED_ROUTES` in
 * the same change, or the classification silently drifts. Unclassified chunks
 * are surfaced by `perf:baseline` as a warning so drift stays observable.
 */
const SHARED_CHUNK_PATTERNS = [
  "index-", // app entry
  "vendor-", // react-dom + react-router manual chunk
  "ui-", // lucide-react + recharts manual chunk
  "data-", // react-query + zustand manual chunk
  "esm-", // date-fns / lib shared chunk
  "types-", // @workspace/types
  "date-formatting-",
  "src-",
  "libphone", // phone input boundary
  "utils-",
  "zod-",
  "select-",
  "calendar-",
  "dist-",
];

/**
 * Tracked routes keyed by the app React Router path. Each entry lists the
 * chunk-name prefixes (Vite names lazy chunks after their source module
 * basename, before the content hash) that represent the route's own JS cost.
 * A route with no matching chunk is measured as shared-core only, which is
 * still a stable floor for regression detection.
 */
const TRACKED_ROUTES = [
  { path: "/login", patterns: ["AuthPageContainer"] },
  // Dashboard renders today's schedule, so its chunk (`today-*`) counts toward
  // /dashboard's first-load cost.
  { path: "/dashboard", patterns: ["today-"] },
  { path: "/patients", patterns: ["patients-page"] },
  { path: "/patients/:id", patterns: ["PatientMedicalHistory"] },
  { path: "/appointments", patterns: ["appointments-page", "AppointmentRequests", "AppointmentRowActions"] },
  { path: "/analytics", patterns: ["analytics"] },
  { path: "/consultation/:id", patterns: ["ConsultationDetailPageContent", "consultation-page"] },
  { path: "/prescriptions/:id", patterns: ["prescriptions-page"] },
  { path: "/invoices/:id", patterns: ["invoices-page"] },
  { path: "/book/:referralCode", patterns: ["public-booking-page"] },
  { path: "/mobile-upload/:id", patterns: ["upload-signature"] },
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

/**
 * Collect per-route first-load bundle sizes for a Vite SPA.
 *
 * Reads `dist/assets/*.js` (built via `vite build`). For each tracked route the
 * metric is the gzipped size of the shared core chunks plus the route's own
 * chunks (each file gzipped individually, mirroring `check-worker-size.mjs`).
 * This is an **upper-bound first-load proxy**: the full shared core is summed
 * into every route even though heavy chunks (`ui-*` = recharts/lucide,
 * `esm-*`) only load where they are actually imported. Internal consistency
 * across builds is what matters — a regression in the core shows up on every
 * route and a regression in a route chunk shows up on that route.
 *
 * Returns the same shape the Next.js-era collector produced (`routeSizes`
 * keyed by route path) so `perf-baseline.mjs`, `check-perf-budget.mjs`, and
 * `check-route-budgets.mjs` keep working unchanged.
 */
export async function collectAppRouteBundleSizes(appDir) {
  const assetsDir = path.join(appDir, "dist", "assets");

  let files;
  try {
    files = await fs.readdir(assetsDir);
  } catch {
    return { appDir, assetsDir, routeSizes: {} };
  }

  const gzipSizes = new Map();
  for (const file of files.filter((f) => f.endsWith(".js"))) {
    const stats = await statSafe(path.join(assetsDir, file));
    if (stats) {
      const raw = await fs.readFile(path.join(assetsDir, file));
      gzipSizes.set(file, gzipSync(raw).length);
    }
  }

  const isShared = (file) =>
    SHARED_CHUNK_PATTERNS.some((pattern) => file.startsWith(pattern));

  const coreBytes = [...gzipSizes.entries()]
    .filter(([file]) => isShared(file))
    .reduce((sum, [, bytes]) => sum + bytes, 0);
  const routeChunks = [...gzipSizes.entries()].filter(([file]) => !isShared(file));

  const routeSizes = {};
  for (const { path: routePath, patterns } of TRACKED_ROUTES) {
    const routeBytes = routeChunks
      .filter(([file]) => patterns.some((pattern) => file.startsWith(pattern)))
      .reduce((sum, [, bytes]) => sum + bytes, 0);
    routeSizes[routePath] = coreBytes + routeBytes;
  }

  return {
    appDir,
    assetsDir,
    routeSizes,
    // Route chunks no pattern matched — lets `perf:baseline` warn about drift.
    unclassifiedChunks: routeChunks
      .filter(
        ([file]) =>
          !TRACKED_ROUTES.some(({ patterns }) =>
            patterns.some((pattern) => file.startsWith(pattern)),
          ),
      )
      .map(([file]) => file),
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
