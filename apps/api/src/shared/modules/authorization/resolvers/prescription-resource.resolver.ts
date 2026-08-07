// jscpd:ignore-start — intentional mirror of appointment-resource.resolver.ts
// (C3, ADR-0013): resolvers share the standard scaffold (imports + resolve
// posture). See docs/analysis/SUPPRESSION_LEDGER.md.
import { Injectable, NotFoundException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { ResourceAttributes } from '@workspace/types';
import type { PolicyResourceResolver } from './policy-resource-resolver.interface';

/**
 * Resolves a `prescription` resource from the route param (`:id` on the
 * prescriptions controller; `:id` on the whatsapp approve-prescription
 * route). Missing row → 404 (no existence disclosure). Cross-clinic rows
 * resolve fine here — the policy's tenant discipline turns them into 404 via
 * PolicyGuard (same wire contract as the clinic-scoped repository). The
 * author-of-record is the row's own `doctorId` (required, non-null). Note
 * `Prescription.clinicId` is nullable (`onDelete: SetNull`) — fall back to
 * the required `appointment` relation, which always carries the clinic.
 */
@Injectable()
export class PrescriptionResourceResolver implements PolicyResourceResolver {
  readonly resource = 'prescription';

  constructor(private readonly prisma: PrismaService) {}

  async resolve(context: ExecutionContext): Promise<ResourceAttributes> {
    const request = context
      .switchToHttp()
      .getRequest<{ params: Record<string, string | undefined> }>();
    const prescriptionId = request.params?.id;
    if (!prescriptionId) throw new NotFoundException('Prescription not found');

    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
      select: {
        id: true,
        clinicId: true,
        doctorId: true,
        patientId: true,
        approvalStatus: true,
        appointment: { select: { clinicId: true } },
      },
    });
    if (!prescription) throw new NotFoundException('Prescription not found');

    return {
      type: 'prescription',
      clinicId: prescription.clinicId ?? prescription.appointment.clinicId,
      ownerId: null,
      assignedDoctorIds: [prescription.doctorId],
      assignedPatientId: prescription.patientId,
      classification: 'phi',
      consentState: null,
      status: prescription.approvalStatus,
      requiresAssignment: false,
    };
  }
}
// jscpd:ignore-end
