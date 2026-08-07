// jscpd:ignore-start — intentional mirror of prescription-resource.resolver.ts
// (C4, ADR-0013): resolvers share the standard scaffold (imports + resolve
// posture). See docs/analysis/SUPPRESSION_LEDGER.md.
import { Injectable, NotFoundException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { ResourceAttributes } from '@workspace/types';
import type { PolicyResourceResolver } from './policy-resource-resolver.interface';

/**
 * Resolves an `invoice` resource from the route param (`:id` on the invoices
 * controller; `:id` on the whatsapp approve-invoice route). Missing row → 404
 * (no existence disclosure). Cross-clinic rows resolve fine here — the
 * policy's tenant discipline turns them into 404 via PolicyGuard (same wire
 * contract as the clinic-scoped repository). Note `Invoice.clinicId` is
 * nullable (`onDelete: SetNull`) — fall back to the required `patient`
 * relation, which always carries the clinic. The patient-owner attribute is
 * `assignedPatientId`; there is deliberately no doctor author-of-record pin
 * (C4.3, resolves C3.1 — the legacy InvoicePolicy has none).
 */
@Injectable()
export class InvoiceResourceResolver implements PolicyResourceResolver {
  readonly resource = 'invoice';

  constructor(private readonly prisma: PrismaService) {}

  async resolve(context: ExecutionContext): Promise<ResourceAttributes> {
    const request = context
      .switchToHttp()
      .getRequest<{ params: Record<string, string | undefined> }>();
    const invoiceId = request.params?.id;
    if (!invoiceId) throw new NotFoundException('Invoice not found');

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        clinicId: true,
        patientId: true,
        status: true,
        approvalStatus: true,
        patient: { select: { clinicId: true } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    return {
      type: 'invoice',
      clinicId: invoice.clinicId ?? invoice.patient.clinicId,
      ownerId: null,
      assignedDoctorIds: [],
      assignedPatientId: invoice.patientId,
      classification: 'billing',
      consentState: null,
      status: invoice.status,
      requiresAssignment: false,
    };
  }
}
// jscpd:ignore-end
