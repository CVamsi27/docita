// Re-export everything from the per-domain appointments hooks folder. This facade
// preserves the original `@workspace/data-access` import surface so existing
// consumers don't need to change.
export * from "./appointments";
