import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApprovalStatus } from '@workspace/db';

/**
 * Handles approval workflow for prescriptions and invoices
 */
@Injectable()
export class ApprovalService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Approve prescription for WhatsApp sharing (clinic-scoped)
   */
  async approvePrescription(id: string, userId: string, clinicId: string) {
    // Verify prescription belongs to user's clinic
    const existing = await this.prisma.prescription.findFirst({
      where: { id, appointment: { clinicId } },
    });
    if (!existing) {
      throw new NotFoundException(`Prescription with ID ${id} not found`);
    }

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
   * Approve invoice for WhatsApp sharing (clinic-scoped)
   */
  async approveInvoice(id: string, userId: string, clinicId: string) {
    // Verify invoice belongs to user's clinic (Invoice has no direct clinicId; scope via appointment)
    const existing = await this.prisma.invoice.findFirst({
      where: { id, appointment: { clinicId } },
    });
    if (!existing) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

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
