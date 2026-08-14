import { getPatientFullName } from '@workspace/utils';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { SystemEventsService } from '@/domains/whatsapp/application/services/system-events.service';
import { StaffNotificationService } from '@/domains/whatsapp/application/services/staff-notification.service';
import {
  WHATSAPP_PERSISTENCE_PORT,
  type WhatsappPersistencePort,
} from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import { PrescriptionCreatedEvent } from '@/domains/prescriptions/core/events/prescription-created.event';
import { InvoiceGeneratedEvent } from '@/domains/billing/application/services/events/invoice-generated.event';
import { PaymentCapturedEvent } from '@/domains/billing/application/services/events/payment-captured.event';
import { AppointmentCreatedEvent } from '@/domains/appointments/application/events/appointment-created.event';
import { AppointmentUpdatedEvent } from '@/domains/appointments/application/events/appointment-updated.event';
import { DoctorDelayMarkedEvent } from '@/domains/appointments/application/events/doctor-delay-marked.event';

@Injectable()
export class WhatsappEventListener {
  private readonly logger = new Logger(WhatsappEventListener.name);

  constructor(
    private readonly systemEventsService: SystemEventsService,
    private readonly staffNotificationService: StaffNotificationService,
    @Inject(WHATSAPP_PERSISTENCE_PORT)
    private readonly persistence: WhatsappPersistencePort,
  ) {}

  @OnEvent(ApplicationEvents.PRESCRIPTION_CREATED)
  async handlePrescriptionCreated(event: PrescriptionCreatedEvent) {
    this.logger.log(
      `Prescription created event received for ${event.prescriptionId} in clinic ${event.clinicId}`,
    );
    try {
      await this.systemEventsService.sendPrescriptionSystem(
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

  @OnEvent(ApplicationEvents.INVOICE_GENERATED)
  async handleInvoiceGenerated(event: InvoiceGeneratedEvent) {
    this.logger.log(
      `Invoice generated event received for ${event.invoiceId} in clinic ${event.clinicId}`,
    );
    try {
      await this.systemEventsService.sendInvoiceSystem(
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

  @OnEvent(ApplicationEvents.PAYMENT_CAPTURED)
  async handlePaymentCaptured(event: PaymentCapturedEvent) {
    this.logger.log(
      `Payment captured event received for invoice ${event.invoiceId} in clinic ${event.clinicId}`,
    );
    try {
      await this.systemEventsService.sendPaymentConfirmation(
        event.invoiceId,
        event.clinicId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send payment confirmation WhatsApp for invoice ${event.invoiceId}`,
        error,
      );
    }

    try {
      const invoice = await this.persistence.invoice.findUnique({
        where: { id: event.invoiceId },
        include: {
          patient: { select: { firstName: true, lastName: true } },
        },
      });
      const patientName = invoice?.patient
        ? getPatientFullName(invoice.patient).trim()
        : 'a patient';
      const amountDisplay = invoice?.total ?? event.amountPaise / 100;
      await this.staffNotificationService.notifyStaff({
        clinicId: event.clinicId,
        type: 'INVOICE_PAID',
        title: 'Payment received',
        message: `${patientName} paid ${amountDisplay} for invoice #${event.invoiceId.slice(0, 8).toUpperCase()}.`,
        priority: 'LOW',
        data: {
          invoiceId: event.invoiceId,
          providerPaymentId: event.providerPaymentId,
          amountPaise: event.amountPaise,
        },
        sendWhatsApp: false,
        sendInApp: true,
      });
    } catch (error) {
      this.logger.error(
        `Failed to create staff payment notification for invoice ${event.invoiceId}`,
        error,
      );
    }
  }

  @OnEvent(ApplicationEvents.APPOINTMENT_CREATED)
  async handleAppointmentCreated(event: AppointmentCreatedEvent) {
    this.logger.log(
      `Appointment created event received for ${event.appointmentId} in clinic ${event.clinicId}`,
    );
    try {
      await this.systemEventsService.sendAppointmentConfirmation(
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

  @OnEvent(ApplicationEvents.DOCTOR_DELAY_MARKED)
  async handleDoctorDelayMarked(event: DoctorDelayMarkedEvent) {
    this.logger.log(
      `Doctor delay marked: ${event.delayMinutes}min for doctor ${event.doctorId}, notifying ${event.affectedAppointmentIds.length} patients`,
    );
    // Each appointment is independent (separate phone, separate template
    // send, separate outbound log). Run them in parallel so a slow
    // WhatsApp API call on one appointment does not block the others;
    // allSettled keeps a single failure from dropping the rest.
    const results = await Promise.allSettled(
      event.affectedAppointmentIds.map((appointmentId) =>
        this.systemEventsService.sendAppointmentDelayNotification(
          appointmentId,
          event.clinicId,
          event.delayMinutes,
        ),
      ),
    );
    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      this.logger.error(
        `Doctor delay notification: ${failures.length} of ${results.length} appointment(s) failed`,
        failures.map((f) => f.reason).join('\n'),
      );
    }
  }

  @OnEvent(ApplicationEvents.APPOINTMENT_UPDATED)
  async handleAppointmentUpdated(event: AppointmentUpdatedEvent) {
    if (event.newStatus === 'cancelled' || event.newStatus === 'no-show') {
      this.logger.log(
        `Appointment cancelled event received for ${event.appointmentId}`,
      );
      try {
        await this.systemEventsService.sendAppointmentUpdate(
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
        await this.systemEventsService.sendAppointmentUpdate(
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
