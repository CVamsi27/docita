"use client";

// Re-export everything from the per-domain clinical hooks folder. This facade
// preserves the original `@workspace/data-access` import surface so existing
// consumers don't need to change.
export * from "./clinical";
