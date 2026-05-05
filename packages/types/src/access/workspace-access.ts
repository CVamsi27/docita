import { APP_ACCESS_TARGETS, type AppAccessTarget } from "./access-matrix";
import type { UserRole } from "../shared/users";
import {
  isFrontDeskWorkspace,
  type WorkspaceProfile,
} from "../shared/workspace-profile";

/**
 * Clinical / EHR-heavy surfaces disabled for all clinic roles when the workspace
 * is front-desk (appointments + invoicing). INTERNAL bypasses in the app gate.
 */
export const FRONT_DESK_BLOCKED_ACCESS_TARGETS: ReadonlySet<AppAccessTarget> =
  new Set([
    APP_ACCESS_TARGETS.PAGE_CONSULTATION,
    APP_ACCESS_TARGETS.PAGE_PRESCRIPTIONS,
    APP_ACCESS_TARGETS.PAGE_LAB_TESTS,
    APP_ACCESS_TARGETS.PAGE_DOCUMENTS,
    APP_ACCESS_TARGETS.PAGE_SPECIALTY,
    APP_ACCESS_TARGETS.PAGE_CODING_QUEUE,
    APP_ACCESS_TARGETS.PAGE_AI_ASSISTANT,
    APP_ACCESS_TARGETS.PAGE_HOSPITAL,

    APP_ACCESS_TARGETS.API_PRESCRIPTIONS,
    APP_ACCESS_TARGETS.API_MEDICAL_DOCUMENTS,
    APP_ACCESS_TARGETS.API_MEDICAL_CODING,
    APP_ACCESS_TARGETS.API_LAB_TESTS,
  ]);

export function isFrontDeskBlockedAccessTarget(
  target: AppAccessTarget,
): boolean {
  return FRONT_DESK_BLOCKED_ACCESS_TARGETS.has(target);
}

export function shouldDenyAccessForWorkspaceProfile(
  target: AppAccessTarget,
  role: UserRole | string | null | undefined,
  workspaceProfile: WorkspaceProfile | null | undefined,
): boolean {
  if (!isFrontDeskWorkspace(workspaceProfile)) {
    return false;
  }

  if (!isFrontDeskBlockedAccessTarget(target)) {
    return false;
  }

  if (role === "INTERNAL") {
    return false;
  }

  return true;
}
