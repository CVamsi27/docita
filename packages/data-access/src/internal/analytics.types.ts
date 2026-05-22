export interface InternalAnalyticsData {
  revenue: number;
  appointments: number;
  newPatients: number;
  avgInvoiceValue: number;
  revenueChange?: number;
  appointmentsChange?: number;
  patientsChange?: number;
  invoiceValueChange?: number;
  detailedMetrics?: Array<Record<string, unknown>>;
}
