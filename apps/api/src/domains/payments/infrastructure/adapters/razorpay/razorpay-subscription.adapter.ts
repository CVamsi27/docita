import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { BaseRazorpayAdapter } from './razorpay.adapter';
import {
  ISubscriptionProvider,
  CreateCustomerRequest,
  PaymentGatewayCustomer,
  CreatePlanRequest,
  CreateSubscriptionRequest,
  PaymentGatewaySubscription,
} from '@/domains/payments/core/ports';

interface RazorpaySubscriptionResponse {
  id: string;
  customer_id: string;
  plan_id: string;
  status: string;
  current_start: number;
  current_end: number;
  notes: Record<string, unknown>;
}

@Injectable()
export class RazorpaySubscriptionAdapter
  extends BaseRazorpayAdapter
  implements ISubscriptionProvider
{
  private readonly logger = new Logger(RazorpaySubscriptionAdapter.name);

  async createCustomer(
    request: CreateCustomerRequest,
  ): Promise<PaymentGatewayCustomer> {
    try {
      const razorpay = this.getClient();
      const customer = await razorpay.customers.create({
        name: request.name,
        email: request.email,
        contact: request.phone,
        notes: request.metadata || {},
      });

      return {
        id: customer.id,
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.contact ? String(customer.contact) : undefined,
        metadata: customer.notes as Record<string, string> | undefined,
      };
    } catch (error) {
      this.logger.error('Failed to create customer', error);
      throw new BadRequestException('Failed to create customer');
    }
  }

  async getCustomer(
    customerId: string,
  ): Promise<PaymentGatewayCustomer | null> {
    try {
      const razorpay = this.getClient();
      const customer = await razorpay.customers.fetch(customerId);

      return {
        id: customer.id,
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.contact ? String(customer.contact) : undefined,
        metadata: customer.notes as Record<string, string> | undefined,
      };
    } catch {
      this.logger.warn(`Customer ${customerId} not found`);
      return null;
    }
  }

  async updateCustomer(
    customerId: string,
    data: Partial<CreateCustomerRequest>,
  ): Promise<PaymentGatewayCustomer> {
    try {
      const razorpay = this.getClient();
      const customer = await razorpay.customers.edit(customerId, {
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
        ...(data.phone && { contact: data.phone }),
        ...(data.metadata && { notes: data.metadata }),
      });

      return {
        id: customer.id,
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.contact ? String(customer.contact) : undefined,
        metadata: customer.notes as Record<string, string> | undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to update customer ${customerId}`, error);
      throw new BadRequestException('Failed to update customer');
    }
  }

  async createPlan(request: CreatePlanRequest): Promise<{ planId: string }> {
    try {
      const razorpay = this.getClient();
      const plan = await razorpay.plans.create({
        period: request.interval,
        interval: request.intervalCount || 1,
        item: {
          name: request.name,
          amount: request.amount.toCents(),
          currency: request.amount.currency,
          description: request.description,
        },
        notes: request.metadata || {},
      });

      return { planId: plan.id };
    } catch (error) {
      this.logger.error('Failed to create plan', error);
      throw new BadRequestException('Failed to create plan');
    }
  }

  async getPlan(planId: string): Promise<unknown> {
    try {
      const razorpay = this.getClient();
      return await razorpay.plans.fetch(planId);
    } catch {
      this.logger.warn(`Plan ${planId} not found`);
      return null;
    }
  }

  async createSubscription(
    request: CreateSubscriptionRequest,
  ): Promise<PaymentGatewaySubscription> {
    try {
      const razorpay = this.getClient();
      const createArgs = {
        plan_id: request.planId,
        customer_id: request.customerId,
        quantity: request.quantity || 1,
        total_count: 999,
        ...(request.startDate && {
          start_at: Math.floor(request.startDate.getTime() / 1000),
        }),
        ...(request.trialPeriodDays && {
          customer_notify: 0,
        }),
        notes: request.metadata || {},
      };
      const subscription = (await razorpay.subscriptions.create(
        createArgs as never,
      )) as unknown as RazorpaySubscriptionResponse;

      return {
        id: subscription.id,
        customerId: subscription.customer_id || '',
        planId: subscription.plan_id,
        status: subscription.status,
        currentPeriodStart: new Date((subscription.current_start || 0) * 1000),
        currentPeriodEnd: new Date((subscription.current_end || 0) * 1000),
        cancelAtPeriodEnd: false,
        metadata: subscription.notes as Record<string, unknown> | undefined,
      };
    } catch (error) {
      this.logger.error('Failed to create subscription', error);
      throw new BadRequestException('Failed to create subscription');
    }
  }

  async getSubscription(
    subscriptionId: string,
  ): Promise<PaymentGatewaySubscription | null> {
    try {
      const razorpay = this.getClient();
      const subscription = (await razorpay.subscriptions.fetch(
        subscriptionId,
      )) as unknown as RazorpaySubscriptionResponse;

      return {
        id: subscription.id,
        customerId: subscription.customer_id || '',
        planId: subscription.plan_id,
        status: subscription.status,
        currentPeriodStart: new Date((subscription.current_start || 0) * 1000),
        currentPeriodEnd: new Date((subscription.current_end || 0) * 1000),
        cancelAtPeriodEnd: false,
        metadata: subscription.notes as Record<string, unknown> | undefined,
      };
    } catch {
      this.logger.warn(`Subscription ${subscriptionId} not found`);
      return null;
    }
  }

  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd = false,
  ): Promise<void> {
    try {
      const razorpay = this.getClient();
      await razorpay.subscriptions.cancel(
        subscriptionId,
        cancelAtPeriodEnd ? 1 : 0,
      );
    } catch (error) {
      this.logger.error(
        `Failed to cancel subscription ${subscriptionId}`,
        error,
      );
      throw new BadRequestException('Failed to cancel subscription');
    }
  }

  async pauseSubscription(subscriptionId: string): Promise<void> {
    try {
      const razorpay = this.getClient();
      await razorpay.subscriptions.pause(subscriptionId);
    } catch (error) {
      this.logger.error(
        `Failed to pause subscription ${subscriptionId}`,
        error,
      );
      throw new BadRequestException('Failed to pause subscription');
    }
  }

  async resumeSubscription(subscriptionId: string): Promise<void> {
    try {
      const razorpay = this.getClient();
      await razorpay.subscriptions.resume(subscriptionId);
    } catch (error) {
      this.logger.error(
        `Failed to resume subscription ${subscriptionId}`,
        error,
      );
      throw new BadRequestException('Failed to resume subscription');
    }
  }
}
