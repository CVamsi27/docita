import { Injectable } from '@nestjs/common';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import type { ConsentType } from '@workspace/db';

export interface DpdpAuditContext {
  userId: string;
  clinicId: string;
  resourceType: string;
  resourceId: string;
  ipAddress?: string;
}

@Injectable()
export class DpdpAuditEmitter {
  constructor(private readonly auditService: AuditService) {}

  async logConsentRecorded(
    ctx: DpdpAuditContext,
    metadata: {
      consentType: ConsentType;
      status: string;
      purpose?: string;
      noticeVersion?: string;
      givenByRelation?: string;
    },
  ): Promise<void> {
    await this.auditService.logAction({
      userId: ctx.userId,
      clinicId: ctx.clinicId,
      actionType: 'CONSENT_RECORDED',
      resourceType: ctx.resourceType,
      resourceId: ctx.resourceId,
      metadata,
      ipAddress: ctx.ipAddress,
    });
  }

  async logConsentWithdrawn(
    ctx: DpdpAuditContext,
    metadata: {
      consentType: ConsentType;
      reason: string;
      withdrawnBy: string;
    },
  ): Promise<void> {
    await this.auditService.logAction({
      userId: ctx.userId,
      clinicId: ctx.clinicId,
      actionType: 'CONSENT_WITHDRAWN',
      resourceType: ctx.resourceType,
      resourceId: ctx.resourceId,
      metadata,
      ipAddress: ctx.ipAddress,
    });
  }

  async logDataAccessRequest(
    ctx: DpdpAuditContext,
    metadata: { requestType: string; reason?: string },
  ): Promise<void> {
    await this.auditService.logAction({
      userId: ctx.userId,
      clinicId: ctx.clinicId,
      actionType: 'DATA_ACCESS_REQUEST',
      resourceType: ctx.resourceType,
      resourceId: ctx.resourceId,
      metadata,
      ipAddress: ctx.ipAddress,
    });
  }

  async logDataCorrectionRequest(
    ctx: DpdpAuditContext,
    metadata: {
      corrections: Record<string, unknown>;
      reason?: string;
    },
  ): Promise<void> {
    await this.auditService.logAction({
      userId: ctx.userId,
      clinicId: ctx.clinicId,
      actionType: 'DATA_CORRECTION_REQUEST',
      resourceType: ctx.resourceType,
      resourceId: ctx.resourceId,
      metadata,
      ipAddress: ctx.ipAddress,
    });
  }

  async logDataErasureRequest(
    ctx: DpdpAuditContext,
    metadata: { reason?: string; anonymized: boolean },
  ): Promise<void> {
    await this.auditService.logAction({
      userId: ctx.userId,
      clinicId: ctx.clinicId,
      actionType: 'DATA_ERASURE_REQUEST',
      resourceType: ctx.resourceType,
      resourceId: ctx.resourceId,
      metadata,
      ipAddress: ctx.ipAddress,
    });
  }

  async logDataPortabilityRequest(
    ctx: DpdpAuditContext,
    metadata: { format: string; recordCount: number },
  ): Promise<void> {
    await this.auditService.logAction({
      userId: ctx.userId,
      clinicId: ctx.clinicId,
      actionType: 'DATA_PORTABILITY_REQUEST',
      resourceType: ctx.resourceType,
      resourceId: ctx.resourceId,
      metadata,
      ipAddress: ctx.ipAddress,
    });
  }
}
