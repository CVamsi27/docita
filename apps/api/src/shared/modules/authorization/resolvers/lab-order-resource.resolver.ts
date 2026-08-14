// jscpd:ignore-start — intentional mirror of invoice-resource.resolver.ts
// (C4, ADR-0013): resolvers share the standard scaffold (imports + resolve
// posture). See docs/analysis/SUPPRESSION_LEDGER.md.
import { Injectable, NotFoundException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { ResourceAttributes } from '@workspace/types';
import type { PolicyResourceResolver } from './policy-resource-resolver.interface';

/**
 * Resolves a `lab-order` resource from the route param (`:id` on the
 * clinical lab-tests order routes). Missing row → 404 (no existence
 * disclosure). Cross-clinic rows resolve fine here — the policy's tenant
 * discipline turns them into 404 via PolicyGuard (same wire contract as the
 * clinic-scoped getOrderById check). `LabTestOrder.clinicId` is required
 * non-null (no fallback needed). `ownerId` carries `orderedBy` (the author)
 * — populated for the deferred assignment-pinning branch (C4.1), not
 * enforced today.
 */
@Injectable()
export class LabOrderResourceResolver implements PolicyResourceResolver {
  readonly resource = 'lab-order';

  constructor(private readonly prisma: PrismaService) {}

  async resolve(context: ExecutionContext): Promise<ResourceAttributes> {
    const request = context
      .switchToHttp()
      .getRequest<{ params: Record<string, string | undefined> }>();
    const orderId = request.params?.id;
    if (!orderId) throw new NotFoundException('Lab order not found');

    const order = await this.prisma.labTestOrder.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        clinicId: true,
        patientId: true,
        orderedBy: true,
        status: true,
      },
    });
    if (!order) throw new NotFoundException('Lab order not found');

    return {
      type: 'lab-order',
      clinicId: order.clinicId,
      ownerId: order.orderedBy,
      assignedDoctorIds: [],
      assignedPatientId: order.patientId,
      classification: 'phi',
      consentState: null,
      status: order.status,
      requiresAssignment: false,
    };
  }
}
// jscpd:ignore-end
