import { lazy } from "react";

/* Dev-only tools */
export const VisualTestPage = lazy(() =>
  import("@/features/tools/pages/tools-pages").then((m) => ({ default: m.VisualTestPage })),
);
export const E2ESessionSeedPage = lazy(() =>
  import("@/features/tools/pages/tools-pages").then((m) => ({ default: m.E2ESessionSeedPage })),
);

/* 404 */
export const NotFoundPage = lazy(() =>
  import("@/features/errors/pages/not-found").then((m) => ({ default: m.NotFoundPage })),
);
