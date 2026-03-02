import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ApprovalStatus } from '@workspace/db';

@Injectable()
export class ApprovalService {
  constructor(private readonly prisma: PrismaService) {}

  async approvePrescription(id: string, userId: string, clinicId: string) {
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

  async approveInvoice(id: string, userId: string, clinicId: string) {
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
