import { RequestWithUser } from '@/shared/common/types/common.types';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import {
  logPatientPortalPhiRead,
  type PatientPhiReadAccessType,
} from '@/shared/modules/audit/audit/patient-access-audit.util';
import { PatientPortalContextService } from '@/domains/patient-portal/application/services/patient-portal-context.service';

export async function auditPatientPortalRead(
  contextService: PatientPortalContextService,
  auditService: AuditService,
  req: RequestWithUser,
  accessType: PatientPhiReadAccessType,
): Promise<{ patientId: string; clinicId: string }> {
  const context = await contextService.getPatientContext(req.user!.id);
  await logPatientPortalPhiRead(
    auditService,
    req,
    context,
    accessType,
  );
  return context;
}
