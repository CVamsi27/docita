/**
 * Shared auth package exports
 * Centralized authentication for all apps
 */

export {
  AuthProvider,
  useAuth,
  usePermission,
  useRole,
  useCanAccess,
  useUser,
  type AuthContextType,
  type User,
  type Permission,
} from './auth-context.js';

export { tokenStorage } from './token-storage.js';
export { PERMISSIONS_BY_ROLE } from './permissions-map.js';
