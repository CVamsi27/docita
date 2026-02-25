export type { ISubscriptionRepository } from './subscription.repository.port';
export const SUBSCRIPTION_REPOSITORY_TOKEN = 'ISubscriptionRepository';

export type {
  IPaymentGateway,
  CreateOrderRequest,
  CreateOrderResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
} from './payment-gateway.port';
export const PAYMENT_GATEWAY_TOKEN = 'IPaymentGateway';

export type {
  IClinicOperations,
  ClinicDetails,
} from './clinic-operations.port';
export const CLINIC_OPERATIONS_TOKEN = 'IClinicOperations';
