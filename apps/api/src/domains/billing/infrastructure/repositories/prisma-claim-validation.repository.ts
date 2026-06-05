import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IClaimValidationRepository,
  InvoiceForClaimValidation,
  AppointmentForClaimValidation,
} from '@/domains/billing/core/repositories/claim-validation.repository';

@Injectable()
export class PrismaClaimValidationRepository implements IClaimValidationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findInvoiceForClaimReadiness(
    id: string,
  ): Promise<InvoiceForClaimValidation | null> {
    return this.prisma.invoice.findUnique({
      where: { id },
      select: {
        id: true,
        appointmentId: true,
        patient: {
          select: {
            clinicId: true,
          },
        },
      },
    });
  }

  async findAppointmentForClaimReadiness(
    id: string,
  ): Promise<AppointmentForClaimValidation | null> {
    return this.prisma.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        diagnoses: {
          select: {
            id: true,
            icdCodeId: true,
          },
        },
        procedures: {
          select: {
            id: true,
            cptCodeId: true,
          },
        },
      },
    });
  }
}
