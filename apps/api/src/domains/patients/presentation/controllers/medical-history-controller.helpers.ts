import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@workspace/db';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { logPatientPhiRead } from '@/shared/modules/audit/audit/patient-access-audit.util';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { PatientService } from '@/domains/patients/application/services/patient.service';

export async function verifyMedicalHistoryPatientAccess(
  patientId: string,
  req: RequestWithUser,
  patientService: PatientService,
): Promise<void> {
  if (req.user?.role === Role.PATIENT) {
    if (!req.user.patientId || req.user.patientId !== patientId)
      throw new ForbiddenException('You can only access your own records');
    return;
  }

  const clinicId = req.user?.clinicId;
  if (!clinicId) throw new NotFoundException('Clinic context required');
  await patientService.getPatient(patientId, clinicId);
}

export function auditViewHistory(
  patientId: string,
  req: RequestWithUser,
  auditService: AuditService,
): Promise<void> {
  return logPatientPhiRead(auditService, req, patientId, 'VIEW_HISTORY');
}
