// Facade for the request-user helpers. The implementation lives in the
// focused per-concern files; this module re-exports getAuthenticatedUserId.
// getMonitoringUserContext lives in ./monitoring-user-context and its
// consumers import it from there directly.
export { getAuthenticatedUserId } from './request-user-id';
