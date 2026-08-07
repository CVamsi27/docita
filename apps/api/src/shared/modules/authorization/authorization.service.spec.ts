import { z } from 'zod';
import { ClinicTier, SubscriptionStatus } from '@workspace/db';
import {
  AppointmentAbacPolicy,
  AuditLogAbacPolicy,
  InvoiceAbacPolicy,
  LabOrderAbacPolicy,
  PatientAbacPolicy,
  PrescriptionAbacPolicy,
} from '@workspace/authorization';
import { subjectAttributesSchema } from '@workspace/types';
import { AuthorizationService } from './authorization.service';
import { AbacPolicyRegistry } from './abac-policy.registry';
import type { ClinicAuthCacheService } from '@/shared/modules/auth/auth/clinic-auth-cache.service';

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
  const abacRegistry = new AbacPolicyRegistry(
    new PatientAbacPolicy(),
    new AppointmentAbacPolicy(),
    new PrescriptionAbacPolicy(),
    new InvoiceAbacPolicy(),
    new LabOrderAbacPolicy(),
    new AuditLogAbacPolicy(),
  );
  return new AuthorizationService(
    cache as ClinicAuthCacheService,
    abacRegistry,
  );
}

function abacSubject(
  over: Partial<z.infer<typeof subjectAttributesSchema>> = {},
) {
  // Route through the canonical schema so fixture drift (new subject
  // attributes) fails here at parse time instead of in the evaluator.
  return subjectAttributesSchema.parse({
    userId: 'u1',
    roles: ['DOCTOR'],
    clinicId: 'clinic-a',
    doctorId: 'd1',
    ...over,
  });
}

describe('AuthorizationService', () => {
  describe('evaluateAbac', () => {
    it('denies with policy_not_found for an unregistered resource', async () => {
      const svc = makeService();
      // Deliberately off-map so this test never needs repointing when a new
      // resource (e.g. C6 'referral') ships — prior resource names (invoice,
      // audit-log) were repointed twice already.
      const result = await svc.evaluateAbac(abacSubject(), 'read', {
        type: 'not-a-resource',
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

    it('allows INTERNAL to read cross-clinic audit logs', async () => {
      const svc = makeService();
      const result = await svc.evaluateAbac(
        abacSubject({
          userId: 'u-internal',
          roles: ['INTERNAL'],
          clinicId: 'internal-bypass',
          doctorId: null,
        }),
        'read',
        {
          type: 'audit-log',
          clinicId: 'clinic-b',
          ownerId: null,
          assignedDoctorIds: [],
          classification: 'phi',
          requiresAssignment: false,
        },
      );
      expect(result.allowed).toBe(true);
    });

    it('allows ADMIN to read same-clinic audit logs', async () => {
      const svc = makeService();
      const result = await svc.evaluateAbac(
        abacSubject({
          userId: 'u-admin',
          roles: ['ADMIN'],
          clinicId: 'clinic-a',
          doctorId: null,
        }),
        'read',
        {
          type: 'audit-log',
          clinicId: 'clinic-a',
          ownerId: null,
          assignedDoctorIds: [],
          classification: 'phi',
          requiresAssignment: false,
        },
      );
      expect(result.allowed).toBe(true);
    });

    it('denies NURSE audit-log read (outside the audit-reader matrix)', async () => {
      const svc = makeService();
      const result = await svc.evaluateAbac(
        abacSubject({
          userId: 'u-nurse',
          roles: ['NURSE'],
          clinicId: 'clinic-a',
          doctorId: null,
        }),
        'read',
        {
          type: 'audit-log',
          clinicId: 'clinic-a',
          ownerId: null,
          assignedDoctorIds: [],
          classification: 'phi',
          requiresAssignment: false,
        },
      );
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toBe('role_denied');
      }
    });
  });
});
