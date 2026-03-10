import { Injectable, Logger } from '@nestjs/common';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  IPaymentGateway,
  CreateCustomerParams,
  CreateCustomerResult,
  CreatePlanParams,
  CreatePlanResult,
  CreateSubscriptionParams,
  CreateSubscriptionResult,
  CancelSubscriptionParams,
  CreateCheckoutParams,
  CreateCheckoutResult,
  WebhookEvent,
} from './payment-gateway.interface';

@Injectable()
export class RazorpaySubscriptionGateway implements IPaymentGateway {
  private readonly logger = new Logger(RazorpaySubscriptionGateway.name);
  private razorpay: Razorpay | null = null;
  readonly provider = 'razorpay';

  constructor(private configService: AppConfigService) {
    this.initializeRazorpay();
  }

  private initializeRazorpay(): void {
    const keyId = this.configService.getRazorpayKeyId();
    const keySecret = this.configService.getRazorpayKeySecret();

    if (!keyId || !keySecret) {
      this.logger.warn(
        'Razorpay credentials not configured. Payment operations will not work.',
      );
      return;
    }

    try {
      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
      this.logger.log('Razorpay gateway initialized successfully');
    } catch (error: unknown) {
      this.logger.error(
        'Failed to initialize Razorpay gateway',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private ensureRazorpayInitialized(): Razorpay {
    if (!this.razorpay) {
      throw new Error('Razorpay gateway is not initialized.');
    }
    return this.razorpay;
  }

  async createCustomer(
    params: CreateCustomerParams,
  ): Promise<CreateCustomerResult> {
    try {
      const razorpay = this.ensureRazorpayInitialized();
      const customer = await razorpay.customers.create({
        name: params.name,
        email: params.email,
        contact: params.phone,
        notes: params.notes || {},
      });

      return { customerId: customer.id };
    } catch (error: unknown) {
      this.logger.error(
        'Failed to create Razorpay customer',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  async getCustomer(
    customerId: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      const razorpay = this.ensureRazorpayInitialized();
      const customer = await razorpay.customers.fetch(customerId);
      return this.toRecord(customer);
    } catch (_error: unknown) {
      this.logger.warn(`Customer ${customerId} not found`);
      return null;
    }
  }

  async createPlan(params: CreatePlanParams): Promise<CreatePlanResult> {
    try {
      const razorpay = this.ensureRazorpayInitialized();
      const period = params.interval === 'monthly' ? 'monthly' : 'yearly';
      const intervalCount = params.intervalCount || 1;

      const plan = await razorpay.plans.create({
        period,
        interval: intervalCount,
        item: {
          name: params.name,
          description: params.description || '',
          amount: params.amountCents,
          currency: params.currency,
        },
      });

      return { planId: plan.id };
    } catch (error: unknown) {
      this.logger.error(
        'Failed to create Razorpay plan',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  async getPlan(planId: string): Promise<Record<string, unknown> | null> {
    try {
      const razorpay = this.ensureRazorpayInitialized();
      const plan = await razorpay.plans.fetch(planId);
      return this.toRecord(plan);
    } catch (_error: unknown) {
      this.logger.warn(`Plan ${planId} not found`);
      return null;
    }
  }

  async createSubscription(
    params: CreateSubscriptionParams,
  ): Promise<CreateSubscriptionResult> {
    try {
      const razorpay = this.ensureRazorpayInitialized();
      const subscriptionData = {
        plan_id: params.planId,
        customer_id: params.customerId,
        quantity: params.quantity || 1,
        total_count: params.totalCount || 12,
        customer_notify: 1 as const,
        notes: params.notes || {},
        ...(params.startAt && {
          start_at: Math.floor(params.startAt.getTime() / 1000),
        }),
      };

      const subscription =
        await razorpay.subscriptions.create(subscriptionData);
      const subscriptionRecord = this.toRecord(subscription);
      const subscriptionId = this.getStringField(subscriptionRecord, 'id');
      const status = this.getStringField(subscriptionRecord, 'status');
      const currentStartSeconds = this.getNumberField(
        subscriptionRecord,
        'current_start',
      );
      const currentEndSeconds = this.getNumberField(
        subscriptionRecord,
        'current_end',
      );
      const shortUrl = this.getStringField(subscriptionRecord, 'short_url');

      if (!subscriptionId || !status) {
        throw new Error(
          'Razorpay subscription response is missing required fields',
        );
      }

      const currentStart = currentStartSeconds
        ? new Date(currentStartSeconds * 1000)
        : new Date();

      const currentEnd = currentEndSeconds
        ? new Date(currentEndSeconds * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      return {
        subscriptionId,
        status,
        currentPeriodStart: currentStart,
        currentPeriodEnd: currentEnd,
        shortUrl,
      };
    } catch (error: unknown) {
      this.logger.error(
        'Failed to create Razorpay subscription',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  async getSubscription(
    subscriptionId: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      const razorpay = this.ensureRazorpayInitialized();
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      return this.toRecord(subscription);
    } catch (_error: unknown) {
      this.logger.warn(`Subscription ${subscriptionId} not found`);
      return null;
    }
  }

  async cancelSubscription(params: CancelSubscriptionParams): Promise<void> {
    try {
      const razorpay = this.ensureRazorpayInitialized();
      await razorpay.subscriptions.cancel(
        params.subscriptionId,
        params.cancelAtPeriodEnd || false,
      );
    } catch (error: unknown) {
      this.logger.error(
        'Failed to cancel Razorpay subscription',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  async pauseSubscription(subscriptionId: string): Promise<void> {
    try {
      const razorpay = this.ensureRazorpayInitialized();
      await razorpay.subscriptions.pause(subscriptionId, {
        pause_at: 'now',
      });
    } catch (error: unknown) {
      this.logger.error(
        'Failed to pause Razorpay subscription',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  async resumeSubscription(subscriptionId: string): Promise<void> {
    try {
      const razorpay = this.ensureRazorpayInitialized();
      await razorpay.subscriptions.resume(subscriptionId, {
        resume_at: 'now',
      });
    } catch (error: unknown) {
      this.logger.error(
        'Failed to resume Razorpay subscription',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  async createTokenFromCheckout(
    paymentId: string,
  ): Promise<{ tokenId: string; customerId: string }> {
    try {
      const razorpay = this.ensureRazorpayInitialized();
      const payment = await razorpay.payments.fetch(paymentId);
      const paymentRecord = this.toRecord(payment);
      const customerId = this.getStringField(paymentRecord, 'customer_id');
      const card = this.toRecord(paymentRecord?.card);
      const cardId = this.getStringField(card, 'id');

      if (!customerId) {
        throw new Error('Payment does not have a customer ID');
      }

      const tokenId = cardId || paymentId;

      return {
        tokenId,
        customerId,
      };
    } catch (error: unknown) {
      this.logger.error(
        'Failed to create token from checkout payment',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  async chargeWithToken(
    customerId: string,
    _tokenId: string,
    amountCents: number,
    currency: string,
    description?: string,
  ): Promise<{ paymentId: string; status: string }> {
    try {
      const razorpay = this.ensureRazorpayInitialized();
      const order = await razorpay.orders.create({
        amount: amountCents,
        currency,
        receipt: `autopay_${Date.now()}`,
        customer_id: customerId,
        notes: { description: description || 'Auto-pay subscription renewal' },
      });
      const orderRecord = this.toRecord(order);
      const orderId = this.getStringField(orderRecord, 'id');

      if (!orderId) {
        throw new Error('Razorpay order response is missing id');
      }

      return {
        paymentId: orderId,
        status: 'created',
      };
    } catch (error: unknown) {
      this.logger.error(
        'Failed to charge with token',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  async createCheckout(
    params: CreateCheckoutParams,
  ): Promise<CreateCheckoutResult> {
    try {
      const razorpay = this.ensureRazorpayInitialized();
      const order = await razorpay.orders.create({
        amount: params.amountCents,
        currency: params.currency,
        receipt: `checkout_${Date.now()}`,
        notes: params.notes || {},
      });

      return {
        sessionId: order.id,
        orderId: order.id,
        checkoutUrl: '',
      };
    } catch (error: unknown) {
      this.logger.error(
        'Failed to create Razorpay checkout',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    try {
      const webhookSecret = this.configService.getRazorpayWebhookSecret();
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(typeof payload === 'string' ? payload : payload.toString())
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch (error: unknown) {
      this.logger.error(
        'Failed to verify webhook signature',
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }

  parseWebhookEvent(payload: unknown): WebhookEvent {
    const data = this.toRecord(payload) ?? {};
    return {
      type: this.getStringField(data, 'event') ?? '',
      data: this.toRecord(data.payload) ?? {},
      rawPayload: payload,
    };
  }

  private toRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    return Object.fromEntries(Object.entries(value));
  }

  private getStringField(
    record: Record<string, unknown> | null,
    key: string,
  ): string | undefined {
    const value = record?.[key];
    return typeof value === 'string' ? value : undefined;
  }

  private getNumberField(
    record: Record<string, unknown> | null,
    key: string,
  ): number | undefined {
    const value = record?.[key];
    return typeof value === 'number' ? value : undefined;
  }
}
