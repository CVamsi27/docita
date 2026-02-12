import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalStatus } from '@workspace/db';

/**
 * Handles approval workflow for prescriptions and invoices
 */
@Injectable()
export class ApprovalService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Approve prescription for WhatsApp sharing
   */
  async approvePrescription(id: string, userId: string) {
    const prescription = await this.prisma.prescription.update({
      where: { id },
      data: {
        approvalStatus: ApprovalStatus.APPROVED,
        approvedById: userId,
        approvedAt: new Date(),
      },
    });

    return { success: true, prescription };
  }

  /**
   * Approve invoice for WhatsApp sharing
   */
  async approveInvoice(id: string, userId: string) {
    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        approvalStatus: ApprovalStatus.APPROVED,
        approvedById: userId,
        approvedAt: new Date(),
      },
    });

    return { success: true, invoice };
  }
}
