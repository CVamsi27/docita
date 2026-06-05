export interface InternalDetailedMetricsRow {
  period: string;
  revenue: number;
  invoices: number;
  avgAmount: number;
  appointments: number;
  fillRate: number;
}

export interface InternalAnalyticsData {
  revenue: number;
  appointments: number;
  newPatients: number;
  avgInvoiceValue: number;
  revenueChange?: number;
  appointmentsChange?: number;
  patientsChange?: number;
  invoiceValueChange?: number;
  detailedMetrics?: InternalDetailedMetricsRow[];
}
