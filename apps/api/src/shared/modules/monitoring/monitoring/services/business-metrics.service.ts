import { Injectable } from '@nestjs/common';
import {
  ensureCounter,
  ensureHistogram,
} from '@/shared/common/utils/prom-metric-factories';

@Injectable()
export class BusinessMetricsService {
  private readonly appointmentsCreated = ensureCounter(
    'business_appointments_created_total',
    'Total appointments created, by clinic and type',
    ['clinic_id', 'type'],
  );

  private readonly appointmentsCompleted = ensureCounter(
    'business_appointments_completed_total',
    'Total appointments completed, by clinic and doctor',
    ['clinic_id', 'doctor_id'],
  );

  private readonly appointmentsCancelled = ensureCounter(
    'business_appointments_cancelled_total',
    'Total appointments cancelled, by clinic and reason',
    ['clinic_id', 'reason'],
  );

  private readonly patientsRegistered = ensureCounter(
    'business_patients_registered_total',
    'Total patients registered, by clinic',
    ['clinic_id'],
  );

  private readonly prescriptionsIssued = ensureCounter(
    'business_prescriptions_issued_total',
    'Total prescriptions issued, by clinic and doctor',
    ['clinic_id', 'doctor_id'],
  );

  private readonly invoicesGenerated = ensureCounter(
    'business_invoices_generated_total',
    'Total invoices generated, by clinic and status',
    ['clinic_id', 'status'],
  );

  private readonly invoicesPaid = ensureCounter(
    'business_invoices_paid_total',
    'Total invoices paid, by clinic and payment method',
    ['clinic_id', 'payment_method'],
  );

  private readonly whatsappMessagesSent = ensureCounter(
    'business_whatsapp_messages_sent_total',
    'Total WhatsApp messages sent, by clinic and type',
    ['clinic_id', 'message_type'],
  );

  private readonly medicationDosesLogged = ensureCounter(
    'business_medication_doses_logged_total',
    'Total medication doses logged, by clinic',
    ['clinic_id'],
  );

  private readonly apiCallsByEndpoint = ensureCounter(
    'business_api_calls_total',
    'Total API calls, by clinic, method, and status group',
    ['clinic_id', 'method', 'status_group'],
  );

  private readonly queueDepth = ensureHistogram(
    'business_queue_depth',
    'Queue depth distribution, by queue name',
    ['queue_name'],
    [0, 1, 5, 10, 25, 50, 100, 500],
  );

  private readonly appointmentDuration = ensureHistogram(
    'business_appointment_duration_minutes',
    'Appointment duration distribution in minutes, by clinic',
    ['clinic_id'],
    [5, 10, 15, 30, 45, 60, 90, 120],
  );

  recordAppointmentCreated(clinicId: string, type: string): void {
    this.appointmentsCreated.inc({ clinic_id: clinicId, type });
  }

  recordAppointmentCompleted(clinicId: string, doctorId: string): void {
    this.appointmentsCompleted.inc({
      clinic_id: clinicId,
      doctor_id: doctorId,
    });
  }

  recordAppointmentCancelled(clinicId: string, reason: string): void {
    this.appointmentsCancelled.inc({ clinic_id: clinicId, reason });
  }

  recordPatientRegistered(clinicId: string): void {
    this.patientsRegistered.inc({ clinic_id: clinicId });
  }

  recordPrescriptionIssued(clinicId: string, doctorId: string): void {
    this.prescriptionsIssued.inc({ clinic_id: clinicId, doctor_id: doctorId });
  }

  recordInvoiceGenerated(clinicId: string, status: string): void {
    this.invoicesGenerated.inc({ clinic_id: clinicId, status });
  }

  recordInvoicePaid(clinicId: string, paymentMethod: string): void {
    this.invoicesPaid.inc({
      clinic_id: clinicId,
      payment_method: paymentMethod,
    });
  }

  recordWhatsAppSent(clinicId: string, messageType: string): void {
    this.whatsappMessagesSent.inc({
      clinic_id: clinicId,
      message_type: messageType,
    });
  }

  recordMedicationDoseLogged(clinicId: string): void {
    this.medicationDosesLogged.inc({ clinic_id: clinicId });
  }

  recordApiCall(clinicId: string, method: string, statusCode: number): void {
    const group =
      statusCode < 200
        ? '1xx'
        : statusCode < 300
          ? '2xx'
          : statusCode < 400
            ? '3xx'
            : statusCode < 500
              ? '4xx'
              : '5xx';
    this.apiCallsByEndpoint.inc({
      clinic_id: clinicId,
      method,
      status_group: group,
    });
  }

  observeQueueDepth(queueName: string, depth: number): void {
    this.queueDepth.observe({ queue_name: queueName }, depth);
  }

  observeAppointmentDuration(clinicId: string, durationMinutes: number): void {
    this.appointmentDuration.observe({ clinic_id: clinicId }, durationMinutes);
  }
}
