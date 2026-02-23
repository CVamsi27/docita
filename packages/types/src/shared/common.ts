// Common
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export type PrismaQuery = Record<string, unknown>;

export interface PaginationMeta {
  cursor: string | undefined;
  hasMore: boolean;
  count: number;
  limit: number;
}

export interface CursorPaginationResult<T> {
  items: T[];
  nextCursor: string | undefined;
  hasMore: boolean;
  count: number;
}

export interface OffsetPaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Log Entry for Super Admin
 */
export interface LogEntry {
  id: string;
  timestamp: string;
  level: "INFO" | "WARNING" | "ERROR";
  module: string;
  message: string;
  details?: string;
}

/**
 * WhatsApp Automation Settings
 */
export interface WhatsAppAutomationSettings {
  enabled: boolean;
  prescriptionSent?: boolean;
  invoiceSent?: boolean;
  appointmentReminder?: boolean;
  appointmentConfirmation?: boolean;
}

/**
 * Payment Gateway Data
 */
export interface PaymentGatewayData {
  gateway: "RAZORPAY" | "STRIPE";
  customerId?: string;
  subscriptionId?: string;
  metadata?: Record<string, string>;
}

/**
 * Scheduled Change for Subscriptions
 */
export interface ScheduledChange {
  type: "UPGRADE" | "DOWNGRADE" | "CANCEL";
  newTier?: string;
  effectiveDate: Date;
  reason?: string;
}
