import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { PrescriptionCreatedEvent } from '@/domains/prescriptions/core/events/prescription-created.event';
import { PrismaService } from '@/prisma/prisma.service';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import { Prisma } from '@workspace/db';

type PrescriptionNotificationPayload = Prisma.PrescriptionGetPayload<{
  include: {
    patient: {
      select: { firstName: true; lastName: true; phoneNumber: true };
    };
    medications: true;
  };
}>;

@Injectable()
export class PrescriptionEventsListener {
  private readonly logger = new Logger(PrescriptionEventsListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sendMessage: SendMessageUseCase,
  ) {}

  @OnEvent(ApplicationEvents.PRESCRIPTION_CREATED)
  async handlePrescriptionCreatedEvent(event: PrescriptionCreatedEvent) {
    const { prescriptionId, clinicId } = event;
    this.logger.log(
      `Handling prescription.created event for ${prescriptionId}`,
    );

    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        patient: {
          select: { firstName: true, lastName: true, phoneNumber: true },
        },
        medications: true,
      },
    });

    if (!prescription || !prescription.patient.phoneNumber) {
      this.logger.warn(
        `Prescription ${prescriptionId} skipped: Patient or phone missing`,
      );
      return;
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { name: true },
    });

    const message = this.composePrescriptionMessage(
      prescription,
      clinic?.name ?? '',
    );

    await this.sendMessage.execute({
      clinicId,
      recipientPhone: prescription.patient.phoneNumber,
      text: message,
    });
  }

  private composePrescriptionMessage(
    prescription: PrescriptionNotificationPayload,
    clinicName: string,
  ): string {
    const patientName = `${prescription.patient.firstName} ${prescription.patient.lastName}`;
    const medsCount = prescription.medications?.length || 0;
    const medList = (prescription.medications || [])
      .map((m) => `- ${m.name}: ${m.dosage}`)
      .join('\n');

    return `Hello ${patientName},\n\nA new prescription has been generated for you by ${clinicName}.\n\nMedications (${medsCount}):\n${medList}\n\nPlease follow the dosage instructions carefully.\n\nThank you,\n${clinicName}`;
  }
}
