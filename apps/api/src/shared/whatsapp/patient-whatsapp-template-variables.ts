import {
  DATE_FORMATS,
  DEFAULT_TIMEZONE,
  docitaPublicInvoiceUrl,
  docitaPublicPayUrl,
  docitaPublicRxUrl,
  formatCurrency,
  formatDate,
  formatTime,
} from '@workspace/utils';

export function buildPrescriptionCreatedVariables(params: {
  prescriptionId: string;
  patientName: string;
  doctorName: string;
  clinicName: string;
}): Record<string, string> {
  const { prescriptionId, patientName, doctorName, clinicName } = params;
  return {
    clinicName,
    patientName,
    doctorName,
    rxToken: prescriptionId,
    rxLink: docitaPublicRxUrl(prescriptionId),
  };
}

export function buildInvoiceCreatedVariables(params: {
  invoiceId: string;
  patientName: string;
  clinicName: string;
  amount: number;
  currency?: string | null;
}): Record<string, string> {
  const { invoiceId, patientName, clinicName, amount, currency } = params;
  return {
    clinicName,
    patientName,
    amount: formatCurrency(amount, { currency: currency ?? undefined }),
    invToken: invoiceId,
    invLink: docitaPublicInvoiceUrl(invoiceId),
  };
}

export function buildInvoiceReadyVariables(params: {
  invoiceId: string;
  patientName: string;
  clinicName: string;
  amount: number;
  currency?: string | null;
  invoiceNumber: string;
  date: string;
  paymentSessionId: string;
}): Record<string, string> {
  const {
    invoiceId,
    patientName,
    clinicName,
    amount,
    currency,
    invoiceNumber,
    date,
    paymentSessionId,
  } = params;
  return {
    clinicName,
    patientName,
    invoiceNumber,
    date,
    amount: formatCurrency(amount, { currency: currency ?? undefined }),
    payToken: paymentSessionId,
    payLink: docitaPublicPayUrl(paymentSessionId),
    invToken: invoiceId,
    invLink: docitaPublicInvoiceUrl(invoiceId),
  };
}

export function buildPaymentReminderVariables(params: {
  patientName: string;
  clinicName: string;
  amount: number;
  currency?: string | null;
  dueDate: string;
  paymentSessionId: string;
}): Record<string, string> {
  const {
    patientName,
    clinicName,
    amount,
    currency,
    dueDate,
    paymentSessionId,
  } = params;
  return {
    clinicName,
    patientName,
    amount: formatCurrency(amount, { currency: currency ?? undefined }),
    dueDate,
    payToken: paymentSessionId,
    payLink: docitaPublicPayUrl(paymentSessionId),
  };
}

/**
 * Formats the patient's updated slot after a doctor-delay shift.
 * `updatedStartTime` must be the appointment start time *after* the delay is persisted.
 */
export function buildAppointmentDelayVariables(params: {
  patientName: string;
  clinicName: string;
  delayMinutes: number;
  updatedStartTime: Date;
  clinicTimezone?: string | null;
}): Record<string, string> {
  const {
    patientName,
    clinicName,
    delayMinutes,
    updatedStartTime,
    clinicTimezone,
  } = params;
  const timezone = clinicTimezone?.trim() || DEFAULT_TIMEZONE;

  return {
    clinicName,
    patientName,
    delayMinutes: String(delayMinutes),
    newDate: formatDate(updatedStartTime, DATE_FORMATS.DATE_MEDIUM, {
      timezone,
    }),
    newTime: formatTime(updatedStartTime, DATE_FORMATS.TIME_MEDIUM, {
      timezone,
    }),
  };
}

export function buildPaymentLinkVariables(params: {
  patientName: string;
  clinicName: string;
  amount: number;
  currency?: string | null;
  paymentSessionId: string;
}): Record<string, string> {
  const { patientName, clinicName, amount, currency, paymentSessionId } =
    params;
  return {
    patientName,
    clinicName,
    amount: formatCurrency(amount, { currency: currency ?? undefined }),
    payToken: paymentSessionId,
    payLink: docitaPublicPayUrl(paymentSessionId),
  };
}
