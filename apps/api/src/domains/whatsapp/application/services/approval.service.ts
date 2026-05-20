import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';
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
      },
    });

    return { success: true, prescription };
  }

  async approveInvoice(id: string, userId: string, clinicId: string) {
    const existing = await this.persistence.invoice.findFirst({
      where: { id, appointment: { clinicId } },
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
