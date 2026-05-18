/**
 * Backward-compat barrel — the prior `use-settings` mega-hook was split into
 * cohesive sub-modules per concern. New consumers should import from the
 * specific hook file (or its subpath export) instead of this barrel.
 */
export * from "./use-clinic-settings";
export * from "./use-prescription-defaults";
export * from "./use-doctors";
export * from "./use-doctor-availability";
export * from "./use-medical-coding-settings";
export * from "./use-subscription";
export * from "./use-user-profile";
