/**
 * Razorpay Subscription Gateway Implementation
 * Handles SaaS subscription billing via Razorpay Subscriptions API
 */

import { Injectable, Logger } from '@nestjs/common';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
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

  constructor() {
    // Lazily initialize Razorpay client only if credentials are available
    this.initializeRazorpay();
  }

  private initializeRazorpay(): void {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

    if (!keyId || !keySecret) {
      this.logger.warn(
        'Razorpay credentials not configured. Payment operations will not work. ' +
          'Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.',
      );
      return;
    }

    try {
      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
      this.logger.log('Razorpay gateway initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Razorpay gateway', error);
    }
  }

  private ensureRazorpayInitialized(): Razorpay {
    if (!this.razorpay) {
      throw new Error(
        'Razorpay gateway is not initialized. Please ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables are set.',
      );
    }
    return this.razorpay;
  }

  // =========================================================================
  // Customer Management
  // =========================================================================

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
    } catch (error) {
      this.logger.error('Failed to create Razorpay customer', error);
      throw error;
    }
  }

  async getCustomer(
    customerId: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      const razorpay = this.ensureRazorpayInitialized();
      const customer = await razorpay.customers.fetch(customerId);
      return customer as unknown as Record<string, unknown>;
    } catch (error) {
      this.logger.warn(`Customer ${customerId} not found`);
      return null;
    }
  }

  // =========================================================================
  // Plan Management
  // =========================================================================

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
    } catch (error) {
      this.logger.error('Failed to create Razorpay plan', error);
      throw error;
    }
  }

  async getPlan(planId: string): Promise<Record<string, unknown> | null> {
    try {
      const razorpay = this.ensureRazorpayInitialized();
      const plan = await razorpay.plans.fetch(planId);
      return plan as unknown as Record<string, unknown>;
    } catch (error) {
      this.logger.warn(`Plan ${planId} not found`);
      return null;
    }
  }

  // =========================================================================
  // Subscription Management
  // =========================================================================

  async createSubscription(
    params: CreateSubscriptionParams,
  ): Promise<CreateSubscriptionResult> {
    try {
      const razorpay = this.ensureRazorpayInitialized();
      const subscriptionData = {
        plan_id: params.planId,
        customer_id: params.customerId,
        quantity: params.quantity || 1,
        total_count: params.totalCount || 12, // Default 12 billing cycles
        customer_notify: 1 as const,
        notes: params.notes || {},
        ...(params.startAt && {
          start_at: Math.floor(params.startAt.getTime() / 1000),
        }),
      };

      const subscription = (await razorpay.subscriptions.create(
        subscriptionData,
      )) as unknown as {
        id: string;
        status: string;
        current_start?: number;
        current_end?: number;
        short_url?: string;
      };

      const currentStart = subscription.current_start
        ? new Date(subscription.current_start * 1000)
        : new Date();

      const currentEnd = subscription.current_end
        ? new Date(subscription.current_end * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

      return {
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: currentStart,
        currentPeriodEnd: currentEnd,
        shortUrl: subscription.short_url,
      };
    } catch (error) {
      this.logger.error('Failed to create Razorpay subscription', error);
      throw error;
    }
  }

  async getSubscription(
    subscriptionId: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      const razorpay = this.ensureRazorpayInitialized();
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      return subscription as unknown as Record<string, unknown>;
    } catch (error) {
      this.logger.warn(`Subscription ${subscriptionId} not found`);
      return null;
    }
  }

  async cancelSubscription(params: CancelSubscriptionParams): Promise<void> {
    try {
      const razorpay = this.ensureRazorpayInitialized();
      // Razorpay cancel takes subscriptionId and optional cancel_at_cycle_end boolean
      await razorpay.subscriptions.cancel(
        params.subscriptionId,
        params.cancelAtPeriodEnd || false,
      );
    } catch (error) {
      this.logger.error('Failed to cancel Razorpay subscription', error);
      throw error;
    }
  }

  async pauseSubscription(subscriptionId: string): Promise<void> {
    try {
      const razorpay = this.ensureRazorpayInitialized();
      await razorpay.subscriptions.pause(subscriptionId, {
        pause_at: 'now',
      });
    } catch (error) {
      this.logger.error('Failed to pause Razorpay subscription', error);
      throw error;
    }
  }

  async resumeSubscription(subscriptionId: string): Promise<void> {
    try {
      const razorpay = this.ensureRazorpayInitialized();
      await razorpay.subscriptions.resume(subscriptionId, {
        resume_at: 'now',
      });
    } catch (error) {
      this.logger.error('Failed to resume Razorpay subscription', error);
      throw error;
    }
  }

  // =========================================================================
  // One-time Checkout (for prorated payments, etc.)
  // =========================================================================

  async createCheckout(
    params: CreateCheckoutParams,
  ): Promise<CreateCheckoutResult> {
    try {
      const razorpay = this.ensureRazorpayInitialized();
      // Create an order for checkout
      const order = await razorpay.orders.create({
        amount: params.amountCents,
        currency: params.currency,
        receipt: `checkout_${Date.now()}`,
        notes: params.notes || {},
      });

      // For Razorpay, we return the order ID
      // Frontend uses Razorpay Checkout with this order_id
      return {
        sessionId: order.id,
        orderId: order.id,
        checkoutUrl: '', // Razorpay uses client-side checkout, not redirect URL
      };
    } catch (error) {
      this.logger.error('Failed to create Razorpay checkout', error);
      throw error;
    }
  }

  // =========================================================================
  // Webhook Handling
  // =========================================================================

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(typeof payload === 'string' ? payload : payload.toString())
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch (error) {
      this.logger.error('Failed to verify webhook signature', error);
      return false;
    }
  }

  parseWebhookEvent(payload: unknown): WebhookEvent {
    const data = payload as Record<string, unknown>;
    return {
      type: data.event as string,
      data: data.payload as Record<string, unknown>,
      rawPayload: payload,
    };
  }
}
