import { forbiddenProblem } from '@/shared/common/errors/forbidden-problem';
import type { Role } from '@workspace/db';
import type { RequestWithUser } from '@/shared/common/types/common.types';
import { getAuthenticatedUserId } from '@/shared/modules/auth/auth/request-user.util';

export interface ClinicStaffRequestContext {
  clinicId: string;
  userId: string;
  role: Role;
}

export function getClinicStaffRequestContext(
  req: RequestWithUser,
): ClinicStaffRequestContext {
  const userId = getAuthenticatedUserId(req.user);
  const clinicId =
    typeof req.user?.clinicId === 'string' ? req.user.clinicId.trim() : '';
  const role = req.user?.role;

  if (!userId || !clinicId || role == null) {
    throw forbiddenProblem('NO_CLINIC', 'No clinic assigned to this user');
  }

  return { clinicId, userId, role };
}

/** Narrow clinic id for tenant-scoped handlers (auth guards already ran). */
export function requireClinicIdFromRequest(req: RequestWithUser): string {
  return getClinicStaffRequestContext(req).clinicId;
}

/** Authenticated user id without requiring an assigned clinic (patient portal, join flow). */
export function requireAuthenticatedUserId(req: RequestWithUser): string {
  const userId = getAuthenticatedUserId(req.user);
  if (!userId) {
    throw forbiddenProblem(
      'AUTHENTICATION_REQUIRED',
      'Authentication required',
    );
  }
  return userId;
}

/** Authenticated user record after JwtAuthGuard (may lack clinicId). */
export function requireAuthenticatedUser(
  req: RequestWithUser,
): NonNullable<RequestWithUser['user']> {
  if (!req.user) {
    throw forbiddenProblem(
      'AUTHENTICATION_REQUIRED',
      'Authentication required',
    );
  }
  requireAuthenticatedUserId(req);
  return req.user;
}
