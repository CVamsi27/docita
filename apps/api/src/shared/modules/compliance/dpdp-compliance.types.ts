import type { ConsentStatus, ConsentType } from '@workspace/db';

export enum DataSubjectRight {
  ACCESS = 'ACCESS',
  PORTABILITY = 'PORTABILITY',
  ERASURE = 'ERASURE',
}

export interface ConsentRecord {
  patientId: string;
  clinicId: string;
  consentType: ConsentType;
  status: ConsentStatus;
  purpose: string;
  givenBy?: string;
  givenAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
  // ID of the staff member performing the consent record action; used as the
  // audit-log actor. Distinct from `givenBy` (a human-readable label) and from
  // `patientId` (the subject of the consent, not a User row).
  actorUserId?: string;
}

export interface DataSubjectRequest {
  patientId: string;
  clinicId: string;
  requestType: DataSubjectRight;
  reason?: string;
  requestedBy: string;
  metadata?: Record<string, unknown>;
}

export interface DpdpNoticeConsentInput {
  patientId: string;
  clinicId: string;
  noticeVersion: string;
  givenByName?: string;
  givenByRelation?: string;
  createdBy?: string;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
}
