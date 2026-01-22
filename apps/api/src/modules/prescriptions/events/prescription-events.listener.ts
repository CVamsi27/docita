import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrescriptionCreatedEvent } from './prescription-created.event';
import { PrismaService } from '../../../prisma/prisma.service';
import { WhatsAppNotificationService } from '../../../common/services/whatsapp-notification.service';

@Injectable()
export class PrescriptionEventsListener {
  private readonly logger = new Logger(PrescriptionEventsListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappNotificationService: WhatsAppNotificationService,
  ) {}

  @OnEvent('prescription.created')
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
      clinic?.name || 'Clinic',
    );

    // Send WhatsApp notification
    await this.whatsappNotificationService.sendNotification({
      type: 'prescription',
      clinicId,
      phoneNumber: prescription.patient.phoneNumber,
      message,
      entityId: prescription.id,
    });
  }

  private composePrescriptionMessage(
    prescription: {
      patient: { firstName: string };
      medications: Array<{
        name: string;
        dosage: string;
        frequency: string;
        [key: string]: unknown;
      }>;
      instructions?: string | null;
    },
    clinicName: string,
  ): string {
    const patientName = prescription.patient.firstName;

    let message = `Hello ${patientName}👋\n\n`;
    message += `Your prescription from *${clinicName}* is ready!\n\n`;
    message += `💊 *Medications:*\n`;

    prescription.medications.forEach((med) => {
      const dosage = med.dosage || '';
      const frequency = med.frequency || '';
      const medicineInfo = [med.name, dosage, frequency]
        .filter(Boolean)
        .join(' - ');
      message += `• ${medicineInfo}\n`;
    });

    if (prescription.instructions) {
      message += `\n📋 *Instructions:*\n${prescription.instructions}\n`;
    }

    message += `\n👨‍⚕️ Please follow the prescription as advised.\n`;
    message += `For queries, contact us anytime. Get well soon! 🏥`;

    return message;
  }
}
