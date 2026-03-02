import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WhatsappService } from '@/shared/modules/messaging/whatsapp/whatsapp.service';
import { PrescriptionCreatedEvent } from '@/domains/prescriptions/core/events/prescription-created.event';
import { InvoiceGeneratedEvent } from '@/domains/billing/application/services/events/invoice-generated.event';
import { AppointmentCreatedEvent } from '@/domains/appointments/application/events/appointment-created.event';
import { AppointmentUpdatedEvent } from '@/domains/appointments/application/events/appointment-updated.event';

@Injectable()
export class WhatsappEventListener {
  private readonly logger = new Logger(WhatsappEventListener.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  @OnEvent('prescription.created')
  async handlePrescriptionCreated(event: PrescriptionCreatedEvent) {
    this.logger.log(
      `Prescription created event received for ${event.prescriptionId} in clinic ${event.clinicId}`,
    );
    try {
      await this.whatsappService.sendPrescriptionSystem(
        event.prescriptionId,
        event.clinicId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send automatic WhatsApp for prescription ${event.prescriptionId}`,
        error,
      );
    }
  }

  @OnEvent('invoice.generated')
  async handleInvoiceGenerated(event: InvoiceGeneratedEvent) {
    this.logger.log(
      `Invoice generated event received for ${event.invoiceId} in clinic ${event.clinicId}`,
    );
    try {
      await this.whatsappService.sendInvoiceSystem(
        event.invoiceId,
        event.clinicId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send automatic WhatsApp for invoice ${event.invoiceId}`,
        error,
      );
    }
  }

  @OnEvent('appointment.created')
  async handleAppointmentCreated(event: AppointmentCreatedEvent) {
    this.logger.log(
      `Appointment created event received for ${event.appointmentId} in clinic ${event.clinicId}`,
    );
    try {
      await this.whatsappService.sendAppointmentConfirmation(
        event.appointmentId,
        event.clinicId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send automatic WhatsApp confirmation for appointment ${event.appointmentId}`,
        error,
      );
    }
  }

  @OnEvent('appointment.updated')
  async handleAppointmentUpdated(event: AppointmentUpdatedEvent) {
    if (event.newStatus === 'cancelled' || event.newStatus === 'no-show') {
      this.logger.log(
        `Appointment cancelled event received for ${event.appointmentId}`,
      );
      try {
        await this.whatsappService.sendAppointmentUpdate(
          event.appointmentId,
          event.clinicId,
          'CANCELLED',
        );
      } catch (error) {
        this.logger.error(
          `Failed to send automatic WhatsApp cancellation for appointment ${event.appointmentId}`,
          error,
        );
      }
      return;
    }

    if (
      event.oldStartTime &&
      event.appointment.getStartTime() &&
      new Date(event.oldStartTime).getTime() !==
        new Date(event.appointment.getStartTime()).getTime()
    ) {
      this.logger.log(
        `Appointment rescheduled event received for ${event.appointmentId}`,
      );
      try {
        await this.whatsappService.sendAppointmentUpdate(
          event.appointmentId,
          event.clinicId,
          'RESCHEDULED',
        );
      } catch (error) {
        this.logger.error(
          `Failed to send automatic WhatsApp reschedule for appointment ${event.appointmentId}`,
          error,
        );
      }
    }
  }
}
