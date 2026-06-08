// Facade that re-exports the public surface from the per-concern tenant
// scope policy modules. Consumers can either keep importing from this
// module (which preserves the previous surface) or import directly from the
// focused files:
//   - tenant-scope-policy.types      (internal types + property validation)
//   - tenant-scope-policy.coerce     (opaque-arg normalization)
//   - tenant-scope-policy.rules      (model → rule lookup)
//   - tenant-scope-policy.diagnostics (rule application + diagnostic builder)
export {
  coerceTenantExtensionArgs,
} from './tenant-scope-policy.coerce';
export {
  getTenantScopeRule,
} from './tenant-scope-policy.rules';
export {
  getTenantScopeDiagnostics,
  applyTenantScopeForTest,
} from './tenant-scope-policy.diagnostics';
