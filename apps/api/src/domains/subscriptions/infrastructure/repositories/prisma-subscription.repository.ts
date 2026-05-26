import { Injectable } from '@nestjs/common';
import { Subscription } from '@/domains/subscriptions/core/entities';
import { ISubscriptionRepository } from '@/domains/subscriptions/application/ports/subscription.repository.port';
import { PrismaService } from '@/prisma/prisma.service';
import { PrismaSubscriptionCoreRepository } from './prisma-subscription-core.repository';
import { PrismaSubscriptionPaymentRepository } from './prisma-subscription-payment.repository';

@Injectable()
export class PrismaSubscriptionRepository implements ISubscriptionRepository {
  constructor(
    private readonly core: PrismaSubscriptionCoreRepository,
    private readonly payments: PrismaSubscriptionPaymentRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findPaymentByRazorpayPaymentId(
    razorpayPaymentId: string,
  ): Promise<{ id: string } | null> {
    return this.prisma
      .getReadClient()
      .subscriptionPayment.findFirst({
        where: { razorpayPaymentId },
        select: { id: true },
      });
  }

  save(subscription: Subscription): Promise<void> {
    return this.core.save(subscription);
  }

  findById(id: string): Promise<Subscription | null> {
    return this.core.findById(id);
  }

  findByClinicId(clinicId: string): Promise<Subscription | null> {
    return this.core.findByClinicId(clinicId);
  }

  findByStatus(status: string): Promise<Subscription[]> {
    return this.core.findByStatus(status);
  }

  findApproachingRenewal(daysThreshold: number): Promise<Subscription[]> {
    return this.core.findApproachingRenewal(daysThreshold);
  }

  update(subscription: Subscription): Promise<void> {
    return this.core.update(subscription);
  }

  markClinicPastDue(clinicId: string, graceUntil: Date): Promise<void> {
    return this.core.markClinicPastDue(clinicId, graceUntil);
  }

  delete(id: string): Promise<void> {
    return this.core.delete(id);
  }

  findBillingContact(clinicId: string) {
    return this.core.findBillingContact(clinicId);
  }

  findExpiryReminderCandidates(params: { startOfDay: Date; endOfDay: Date }) {
    return this.core.findExpiryReminderCandidates(params);
  }

  findGraceDeadlineReminderCandidates(params: {
    startOfDay: Date;
    endOfDay: Date;
  }) {
    return this.core.findGraceDeadlineReminderCandidates(params);
  }

  findRecentReminderClinicIds(params: {
    clinicIds: string[];
    reminderType: string;
    reminderCutoff: Date;
  }) {
    return this.core.findRecentReminderClinicIds(params);
  }

  createSubscriptionReminders(
    reminders: Parameters<
      PrismaSubscriptionCoreRepository['createSubscriptionReminders']
    >[0],
  ) {
    return this.core.createSubscriptionReminders(reminders);
  }

  savePayment(
    payment: Parameters<PrismaSubscriptionPaymentRepository['savePayment']>[0],
  ) {
    return this.payments.savePayment(payment);
  }

  updatePaymentStatus(
    orderId: string,
    status: string,
    details?: Parameters<
      PrismaSubscriptionPaymentRepository['updatePaymentStatus']
    >[2],
  ) {
    return this.payments.updatePaymentStatus(orderId, status, details);
  }

  updatePaymentStatusById(
    clinicId: string,
    paymentId: string,
    status: string,
    details?: Parameters<
      PrismaSubscriptionPaymentRepository['updatePaymentStatusById']
    >[3],
  ) {
    return this.payments.updatePaymentStatusById(
      clinicId,
      paymentId,
      status,
      details,
    );
  }

  findPaymentsByClinicId(clinicId: string, limit: number) {
    return this.payments.findPaymentsByClinicId(clinicId, limit);
  }

  findPaymentById(clinicId: string, paymentId: string) {
    return this.payments.findPaymentById(clinicId, paymentId);
  }

  findPaymentByOrderId(clinicId: string, orderId: string) {
    return this.payments.findPaymentByOrderId(clinicId, orderId);
  }

  updatePaymentLink(
    params: Parameters<
      PrismaSubscriptionPaymentRepository['updatePaymentLink']
    >[0],
  ) {
    return this.payments.updatePaymentLink(params);
  }

  expireDuplicatePendingCheckouts(
    params: Parameters<
      PrismaSubscriptionPaymentRepository['expireDuplicatePendingCheckouts']
    >[0],
  ) {
    return this.payments.expireDuplicatePendingCheckouts(params);
  }

  expireOtherPendingSubscriptionCheckouts(
    params: Parameters<
      PrismaSubscriptionPaymentRepository['expireOtherPendingSubscriptionCheckouts']
    >[0],
  ) {
    return this.payments.expireOtherPendingSubscriptionCheckouts(params);
  }

  findReusablePendingCheckout(
    params: Parameters<
      PrismaSubscriptionPaymentRepository['findReusablePendingCheckout']
    >[0],
  ) {
    return this.payments.findReusablePendingCheckout(params);
  }
}
