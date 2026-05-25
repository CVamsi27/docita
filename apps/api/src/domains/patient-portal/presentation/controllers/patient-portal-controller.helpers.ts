import { RequestWithUser } from '@/shared/common/types/common.types';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import {
  logPatientPortalPhiRead,
  type PatientPhiReadAccessType,
} from '@/shared/modules/audit/audit/patient-access-audit.util';
import { PatientPortalContextService } from '@/domains/patient-portal/application/services/patient-portal-context.service';
import { requireAuthenticatedUserId } from '@/shared/modules/auth/auth/clinic-request-context';

export async function auditPatientPortalRead(
  contextService: PatientPortalContextService,
  auditService: AuditService,
  req: RequestWithUser,
  accessType: PatientPhiReadAccessType,
): Promise<{ patientId: string; clinicId: string }> {
  const context = await contextService.getPatientContext(
    requireAuthenticatedUserId(req),
  );
  await logPatientPortalPhiRead(auditService, req, context, accessType);
  return context;
}
