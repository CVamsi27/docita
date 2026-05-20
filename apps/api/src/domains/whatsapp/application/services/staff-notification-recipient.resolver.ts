import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { Role, StaffNotificationType } from '@workspace/db';
import { Prisma } from '@workspace/db';
import { isFrontDeskWorkspace, parseWorkspaceProfile } from '@workspace/types';
import type {
  INotificationRecipientResolver,
  NotificationRecipient,
} from '@/domains/whatsapp/application/ports/notification-recipient-resolver.port';

@Injectable()
export class StaffNotificationRecipientResolver implements INotificationRecipientResolver {
  constructor(private readonly prisma: PrismaService) {}

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

    if (doctorId && !targetRoles.includes('DOCTOR' as Role)) {
      return this.prisma.user.findMany({
        where: {
          OR: [where, { id: doctorId, clinicId }],
        },
        select: {
          id: true,
          phoneNumber: true,
        },
      });
    }

    return this.prisma.user.findMany({
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
      APPOINTMENT_CANCEL: ['RECEPTIONIST', 'ADMIN', 'ADMIN_DOCTOR', 'DOCTOR'],
      APPOINTMENT_DELAY: ['RECEPTIONIST', 'ADMIN_DOCTOR', 'DOCTOR'],
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

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { settings: true },
    });
    const raw =
      clinic?.settings && typeof clinic.settings === 'object'
        ? (clinic.settings as Record<string, unknown>)
        : {};
    if (isFrontDeskWorkspace(parseWorkspaceProfile(raw.workspaceProfile))) {
      return ['ADMIN', 'ADMIN_DOCTOR', 'RECEPTIONIST'];
    }

    return base;
  }
}
