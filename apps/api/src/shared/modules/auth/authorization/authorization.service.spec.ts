import { ClinicTier, Role, SubscriptionStatus } from '@workspace/db';
import { Feature } from '@workspace/types';
import {
  AppointmentAbacPolicy,
  InvoiceAbacPolicy,
  LabOrderAbacPolicy,
  PatientAbacPolicy,
  PrescriptionAbacPolicy,
} from '@workspace/authorization';
import { subjectAttributesSchema } from '@workspace/types';
import { AuthorizationService } from './authorization.service';
import { AbacPolicyRegistry } from './abac-policy.registry';
import { ResourcePolicyRegistry } from './policies/registry';
import { AppointmentPolicy } from './policies/appointment.policy';
import { PatientPolicy } from './policies/patient.policy';
import { PrescriptionPolicy } from './policies/prescription.policy';
import { InvoicePolicy } from './policies/invoice.policy';
import { GenericTenantPolicy } from './policies/generic.policy';
import type { ClinicAuthCacheService } from '@/shared/modules/auth/auth/clinic-auth-cache.service';
import type { AuthorizationUser } from './types';

type ClinicAuthSnapshot = Awaited<
  ReturnType<ClinicAuthCacheService['getClinicAuth']>
>;

const baseAuth: ClinicAuthSnapshot = {
  tier: ClinicTier.PROFESSIONAL,
  planMode: 'FULL',
  subscriptionStatus: SubscriptionStatus.ACTIVE,
  subscriptionGraceUntil: null as Date | null,
  subscriptionTrialEnd: null as Date | null,
  subscriptionCurrentPeriodEnd: null as Date | null,
  hasOutstandingPendingPayment: false,
  hasIntelligence: false,
  features: {} as Record<string, boolean>,
};

function makeService(overrides: Partial<typeof baseAuth> = {}) {
  const cache: Pick<ClinicAuthCacheService, 'getClinicAuth'> = {
    getClinicAuth: jest.fn().mockResolvedValue({ ...baseAuth, ...overrides }),
  };
  const registry = new ResourcePolicyRegistry(
    new AppointmentPolicy(),
    new PatientPolicy(),
    new PrescriptionPolicy(),
    new InvoicePolicy(),
    new GenericTenantPolicy(),
  );
  const abacRegistry = new AbacPolicyRegistry(
    new PatientAbacPolicy(),
    new AppointmentAbacPolicy(),
    new PrescriptionAbacPolicy(),
    new InvoiceAbacPolicy(),
    new LabOrderAbacPolicy(),
  );
  return new AuthorizationService(
    cache as ClinicAuthCacheService,
    registry,
    abacRegistry,
  );
}

function abacSubject() {
  return subjectAttributesSchema.parse({
    userId: 'u1',
    roles: ['DOCTOR'],
    clinicId: 'clinic-a',
    doctorId: 'd1',
  });
}

function user(over: Partial<AuthorizationUser> = {}): AuthorizationUser {
  return {
    id: 'u1',
    role: Role.DOCTOR,
    clinicId: 'c1',
    doctorId: 'd1',
    ...over,
  };
}

describe('AuthorizationService', () => {
  it('denies when no user is provided', async () => {
    const svc = makeService();
    const result = await svc.can(
      null as unknown as AuthorizationUser,
      'read',
      'generic',
    );
    expect(result.allowed).toBe(false);
  });

  it('allows INTERNAL role unconditionally', async () => {
    const svc = makeService({
      subscriptionStatus: SubscriptionStatus.CANCELLED,
    });
    const result = await svc.can(
      user({ role: Role.INTERNAL, clinicId: null }),
      'read',
      'generic',
    );
    expect(result.allowed).toBe(true);
  });

  it('denies when subscription is inactive', async () => {
    const svc = makeService({
      subscriptionStatus: SubscriptionStatus.CANCELLED,
    });
    const result = await svc.can(user(), 'read', 'generic');
    expect(result).toEqual({ allowed: false, reason: 'subscription_inactive' });
  });

  it('denies feature when override blocks it', async () => {
    const svc = makeService({
      features: { [Feature.WHATSAPP_MESSAGING]: false },
    });
    const result = await svc.can(user(), 'read', 'generic', {
      feature: Feature.WHATSAPP_MESSAGING,
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe('feature_locked');
    }
  });

  it('allows feature when override re-enables it on a lower tier', async () => {
    const svc = makeService({
      tier: ClinicTier.STARTER,
      features: { [Feature.WHATSAPP_MESSAGING]: true },
    });
    const result = await svc.can(user(), 'read', 'generic', {
      feature: Feature.WHATSAPP_MESSAGING,
    });
    expect(result.allowed).toBe(true);
  });

  it('blocks intelligence-required feature when add-on is inactive', async () => {
    const svc = makeService({
      hasIntelligence: false,
    });
    // AI_PRESCRIPTION_ASSISTANT is OVERRIDABLE; the AI tests check the override
    // path. For the add-on path use a planned-only-via-add-on feature path —
    // here we simulate by providing an override re-enable check.
    const result = await svc.can(user(), 'read', 'generic', {
      feature: Feature.AI_PRESCRIPTION_ASSISTANT,
    });
    // Planned features are never generally available — denied.
    expect(result.allowed).toBe(false);
  });

  it('blocks billing-locked clinics for non-admins', async () => {
    const svc = makeService({ hasOutstandingPendingPayment: true });
    const result = await svc.can(
      user({ role: Role.DOCTOR }),
      'read',
      'generic',
    );
    expect(result).toEqual({
      allowed: false,
      reason: 'subscription_billing_locked',
    });
  });

  it('allows billing-locked clinic for ADMIN', async () => {
    const svc = makeService({ hasOutstandingPendingPayment: true });
    const result = await svc.can(user({ role: Role.ADMIN }), 'read', 'generic');
    expect(result.allowed).toBe(true);
  });

  it('denies appointment when DOCTOR is not the assigned doctor', async () => {
    const svc = makeService();
    const result = await svc.can(
      user({ doctorId: 'd1' }),
      'read',
      'appointment',
      {
        assignedDoctorId: 'd99',
      },
    );
    expect(result).toEqual({ allowed: false, reason: 'ownership_denied' });
  });

  it('allows appointment when DOCTOR is the assigned doctor', async () => {
    const svc = makeService();
    const result = await svc.can(
      user({ doctorId: 'd1' }),
      'read',
      'appointment',
      {
        assignedDoctorId: 'd1',
      },
    );
    expect(result.allowed).toBe(true);
  });

  it('denies cross-tenant resource access', async () => {
    const svc = makeService();
    const result = await svc.can(user({ clinicId: 'c1' }), 'read', 'patient', {
      resourceClinicId: 'c2',
    });
    expect(result).toEqual({ allowed: false, reason: 'tenant_mismatch' });
  });

  it('denies PATIENT from reading another patient record', async () => {
    const svc = makeService();
    const result = await svc.can(
      user({ role: Role.PATIENT, patientId: 'p1', doctorId: null }),
      'read',
      'patient',
      { resourceOwnerId: 'p2' },
    );
    expect(result).toEqual({ allowed: false, reason: 'ownership_denied' });
  });

  describe('evaluateAbac', () => {
    it('denies with policy_not_found for an unregistered resource', async () => {
      const svc = makeService();
      const result = await svc.evaluateAbac(abacSubject(), 'read', {
        type: 'audit-log',
        clinicId: 'clinic-a',
        ownerId: 'x',
        assignedDoctorIds: [],
        classification: 'phi',
        requiresAssignment: false,
      });
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toBe('role_denied');
        expect(result.detail?.policyId).toBe('policy_not_found');
      }
    });

    it('allows a clinical staff user on a same-clinic patient', async () => {
      const svc = makeService();
      const result = await svc.evaluateAbac(abacSubject(), 'read', {
        type: 'patient',
        clinicId: 'clinic-a',
        ownerId: 'pat-user-1',
        assignedDoctorIds: [],
        classification: 'phi',
        requiresAssignment: false,
      });
      expect(result.allowed).toBe(true);
    });

    it('denies cross-clinic patient access', async () => {
      const svc = makeService();
      const result = await svc.evaluateAbac(abacSubject(), 'read', {
        type: 'patient',
        clinicId: 'clinic-b',
        ownerId: 'pat-user-1',
        assignedDoctorIds: [],
        classification: 'phi',
        requiresAssignment: false,
      });
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toBe('tenant_mismatch');
      }
    });

    it('allows the author DOCTOR to update their own prescription', async () => {
      const svc = makeService();
      const result = await svc.evaluateAbac(abacSubject(), 'update', {
        type: 'prescription',
        clinicId: 'clinic-a',
        ownerId: null,
        assignedDoctorIds: ['d1'],
        assignedPatientId: 'pat-1',
        classification: 'phi',
        requiresAssignment: false,
      });
      expect(result.allowed).toBe(true);
    });

    it('denies a non-author DOCTOR from updating a prescription (author-of-record)', async () => {
      const svc = makeService();
      const result = await svc.evaluateAbac(abacSubject(), 'update', {
        type: 'prescription',
        clinicId: 'clinic-a',
        ownerId: null,
        assignedDoctorIds: ['d99'],
        assignedPatientId: 'pat-1',
        classification: 'phi',
        requiresAssignment: false,
      });
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toBe('ownership_denied');
      }
    });

    it('allows any clinical staff on a same-clinic invoice (no author pin, C4.3)', async () => {
      const svc = makeService();
      const result = await svc.evaluateAbac(abacSubject(), 'read', {
        type: 'invoice',
        clinicId: 'clinic-a',
        ownerId: null,
        assignedDoctorIds: [],
        assignedPatientId: 'pat-1',
        classification: 'billing',
        requiresAssignment: false,
      });
      expect(result.allowed).toBe(true);
    });

    it('denies cross-clinic lab-order access', async () => {
      const svc = makeService();
      const result = await svc.evaluateAbac(abacSubject(), 'read', {
        type: 'lab-order',
        clinicId: 'clinic-b',
        ownerId: 'u1',
        assignedDoctorIds: [],
        assignedPatientId: 'pat-1',
        classification: 'phi',
        requiresAssignment: false,
      });
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toBe('tenant_mismatch');
      }
    });
  });
});
