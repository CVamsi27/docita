import { Inject, Injectable } from '@nestjs/common';
import {
  WHATSAPP_PERSISTENCE_PORT,
  type WhatsappPersistencePort,
} from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import { Prisma, Role, type StaffNotificationType } from '@workspace/db';
import { isFrontDeskTier } from '@workspace/types';
import type {
  INotificationRecipientResolver,
  NotificationRecipient,
} from '@/domains/whatsapp/application/ports/notification-recipient-resolver.port';

@Injectable()
export class StaffNotificationRecipientResolver implements INotificationRecipientResolver {
  constructor(
    @Inject(WHATSAPP_PERSISTENCE_PORT)
    private readonly persistence: WhatsappPersistencePort,
  ) {}

  async resolveStaffRecipients(
    clinicId: string,
    doctorId: string | undefined,
    type: StaffNotificationType,
  ): Promise<NotificationRecipient[]> {
    const targetRoles = await this.getTargetRolesForClinic(clinicId, type);

    const where: Prisma.UserWhereInput = {
      clinicId,
      role: { in: targetRoles },
    };

    if (doctorId && !targetRoles.includes(Role.DOCTOR)) {
      return this.persistence.user.findMany({
        where: {
          OR: [where, { id: doctorId, clinicId }],
        },
        select: {
          id: true,
          phoneNumber: true,
        },
      });
    }

    return this.persistence.user.findMany({
      where,
      select: {
        id: true,
        phoneNumber: true,
      },
    });
  }

  private getTargetRoles(type: StaffNotificationType): Role[] {
    const routingMap: Partial<Record<StaffNotificationType, Role[]>> = {
      PATIENT_RESPONSE: ['RECEPTIONIST', 'ADMIN', 'ADMIN_DOCTOR'],
      APPOINTMENT_CANCEL: [
        'RECEPTIONIST',
        'ADMIN',
        'ADMIN_DOCTOR',
        'DOCTOR',
        'NURSE',
      ],
      APPOINTMENT_DELAY: ['RECEPTIONIST', 'ADMIN_DOCTOR', 'DOCTOR', 'NURSE'],
      PRESCRIPTION_PENDING: ['DOCTOR', 'ADMIN_DOCTOR'],
      INVOICE_PENDING: ['ADMIN', 'ADMIN_DOCTOR'],
      SYSTEM_ALERT: ['ADMIN', 'ADMIN_DOCTOR'],
      APPOINTMENT_REQUEST_CREATED: ['RECEPTIONIST', 'ADMIN', 'ADMIN_DOCTOR'],
      APPOINTMENT_REQUEST_APPROVED: ['RECEPTIONIST', 'ADMIN', 'ADMIN_DOCTOR'],
      APPOINTMENT_REQUEST_REJECTED: ['RECEPTIONIST', 'ADMIN', 'ADMIN_DOCTOR'],
      APPOINTMENT_RESCHEDULED: [
        'RECEPTIONIST',
        'ADMIN',
        'ADMIN_DOCTOR',
        'DOCTOR',
      ],
      APPOINTMENT_NO_SHOW: ['RECEPTIONIST', 'ADMIN', 'ADMIN_DOCTOR', 'DOCTOR'],
      APPOINTMENT_CONFIRMED: [
        'RECEPTIONIST',
        'ADMIN',
        'ADMIN_DOCTOR',
        'DOCTOR',
      ],
      PRESCRIPTION_SENT: ['DOCTOR', 'ADMIN_DOCTOR'],
      PRESCRIPTION_FAILED: ['DOCTOR', 'ADMIN_DOCTOR'],
      INVOICE_SENT: ['ADMIN', 'ADMIN_DOCTOR'],
      INVOICE_FAILED: ['ADMIN', 'ADMIN_DOCTOR'],
      INVOICE_PAID: ['RECEPTIONIST', 'ADMIN', 'ADMIN_DOCTOR'],
      SUBSCRIPTION_PAYMENT_DUE_SOON: ['ADMIN', 'ADMIN_DOCTOR'],
      SUBSCRIPTION_PAYMENT_OVERDUE: ['ADMIN', 'ADMIN_DOCTOR'],
      SUBSCRIPTION_PAYMENT_SUCCESS: ['ADMIN', 'ADMIN_DOCTOR'],
      SUBSCRIPTION_PAYMENT_FAILED: ['ADMIN', 'ADMIN_DOCTOR'],
      PAYMENT_PROVIDER_STATUS_UPDATE: ['ADMIN', 'ADMIN_DOCTOR'],
      CONSULTATION_STARTED: ['DOCTOR', 'ADMIN_DOCTOR'],
      CONSULTATION_SIGNED: ['DOCTOR', 'ADMIN_DOCTOR'],
      CONSULTATION_PENDING_ACTION: ['DOCTOR', 'ADMIN_DOCTOR'],
    };

    return routingMap[type] || ['ADMIN', 'ADMIN_DOCTOR'];
  }

  private async getTargetRolesForClinic(
    clinicId: string,
    type: StaffNotificationType,
  ): Promise<Role[]> {
    const base = this.getTargetRoles(type);
    if (type !== 'PRESCRIPTION_PENDING') {
      return base;
    }

    const clinic = await this.persistence.clinic.findUnique({
      where: { id: clinicId },
      select: { tier: true },
    });
    if (isFrontDeskTier(clinic?.tier)) {
      return ['ADMIN', 'ADMIN_DOCTOR', 'RECEPTIONIST'];
    }

    return base;
  }
}
