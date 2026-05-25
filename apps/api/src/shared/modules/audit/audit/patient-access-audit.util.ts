import { RequestWithUser } from '@/shared/common/types/common.types';
import { AuditService } from './audit.service';

export type PatientPhiReadAccessType =
  | 'VIEW_HISTORY'
  | 'VIEW_PROFILE'
  | 'EXPORT_DATA';

/** Emits patient PHI read audit when actor and clinic context are present. */
export async function logPatientPhiRead(
  auditService: AuditService,
  req: RequestWithUser,
  patientId: string,
  accessType: PatientPhiReadAccessType,
): Promise<void> {
  const userId = req.user?.id;
  const clinicId = req.user?.clinicId;
  if (!userId || !clinicId) {
    return;
  }

  await auditService.logPatientAccess(
    userId,
    clinicId,
    patientId,
    accessType,
    req.ip,
    req.headers?.['user-agent'],
  );
}

/** Patient-portal reads: actor is the portal user; clinic comes from resolved patient context. */
export async function logPatientPortalPhiRead(
  auditService: AuditService,
  req: RequestWithUser,
  context: { patientId: string; clinicId: string },
  accessType: PatientPhiReadAccessType,
): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    return;
  }

  await auditService.logPatientAccess(
    userId,
    context.clinicId,
    context.patientId,
    accessType,
    req.ip,
    req.headers?.['user-agent'],
  );
}

export type ClinicPhiListReadAction =
  | 'VIEW_PATIENT_LIST'
  | 'VIEW_APPOINTMENT_LIST'
  | 'VIEW_PRESCRIPTION_LIST'
  | 'VIEW_LAB_ORDER_LIST';

export type ClinicPhiListReadResourceType =
  | 'Patient'
  | 'Appointment'
  | 'Prescription'
  | 'LabOrder';

/** Emits clinic-scoped PHI list/search audit (no single patient id). */
export async function logClinicPhiListRead(
  auditService: AuditService,
  req: RequestWithUser,
  actionType: ClinicPhiListReadAction,
  resourceType: ClinicPhiListReadResourceType,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const userId = req.user?.id;
  const clinicId = req.user?.clinicId;
  if (!userId || !clinicId) {
    return;
  }

  await auditService.logAction({
    userId,
    clinicId,
    actionType,
    resourceType,
    resourceId: clinicId,
    ipAddress: req.ip,
    userAgent: req.headers?.['user-agent'],
    metadata,
  });
}
