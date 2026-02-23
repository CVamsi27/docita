import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WhatsappService } from '../whatsapp.service';
import { PrescriptionCreatedEvent } from '../../../../../domains/prescriptions/events/prescription-created.event';
import { InvoiceGeneratedEvent } from '../../../../../domains/invoices/events/invoice-generated.event';
import { AppointmentCreatedEvent } from '../../../../../domains/appointments/events/appointment-created.event';
import { AppointmentUpdatedEvent } from '../../../../../domains/appointments/events/appointment-updated.event';

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
    // Only send if status changed to cancelled or rescheduled (logic check done here or passed?)
    // Actually the event has oldStatus and newStatus.
    // Assuming 'scheduled' -> 'cancelled' or time change (which might not change status but is an update).
    // For now, let's focus on status changes: 'cancelled'.
    // Rescheduling is tricky because type might stay the same but startTime changes.
    // We would need to detect start time change.
    // For now, let's trigger on 'cancelled'.

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

    // Check for rescheduling (start time changed)
    if (
      event.oldStartTime &&
      event.appointment.startTime &&
      new Date(event.oldStartTime).getTime() !==
        new Date(event.appointment.startTime).getTime()
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
