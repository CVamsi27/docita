import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  WHATSAPP_PERSISTENCE_PORT,
  type WhatsappPersistencePort,
} from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import { ApprovalStatus } from '@workspace/db';

@Injectable()
export class ApprovalService {
  constructor(
    @Inject(WHATSAPP_PERSISTENCE_PORT)
    private readonly persistence: WhatsappPersistencePort,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async approvePrescription(id: string, userId: string, clinicId: string) {
    const existing = await this.persistence.prescription.findFirst({
      where: { id, appointment: { clinicId } },
    });
    if (!existing) {
      throw new NotFoundException(`Prescription with ID ${id} not found`);
    }

    const prescription = await this.persistence.prescription.update({
      where: { id },
      data: {
        approvalStatus: ApprovalStatus.APPROVED,
        approvedById: userId,
        approvedAt: this.clock.now(),
        version: { increment: 1 },
      },
    });

    return { success: true, prescription };
  }

  async approveInvoice(id: string, userId: string, clinicId: string) {
    // Invoice.clinicId is nullable (onDelete: SetNull); tenant scope is read
    // through the required patient relation instead. The legacy
    // `appointment: { clinicId }` filter copy-pasted from approvePrescription
    // was wrong because not every invoice has a linked appointment (the
    // e2e `factories.invoice()` only sets `patientId`), so the lookup
    // returned null and the e2e InvoiceAbacPolicy test (C4.3) falsely 404'd.
    const existing = await this.persistence.invoice.findFirst({
      where: { id, patient: { clinicId } },
    });
    if (!existing) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    const invoice = await this.persistence.invoice.update({
      where: { id },
      data: {
        approvalStatus: ApprovalStatus.APPROVED,
        approvedById: userId,
        approvedAt: this.clock.now(),
      },
    });

    return { success: true, invoice };
  }
}
