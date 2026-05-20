import {
  applyTenantScopeForTest,
  getTenantScopeDiagnostics,
  getTenantScopeRule,
} from './tenant-scope-policy';

describe('tenant extension scope rules', () => {
  it('derives direct clinic scope from the Prisma datamodel', () => {
    expect(getTenantScopeRule('Patient')).toEqual({ kind: 'direct' });
    expect(getTenantScopeRule('SubscriptionReminder')).toEqual({
      kind: 'direct',
    });
    expect(getTenantScopeRule('ApiKey')).toEqual({ kind: 'direct' });
    expect(getTenantScopeRule('Prescription')).toEqual({ kind: 'direct' });
    expect(getTenantScopeRule('Bed')).toEqual({ kind: 'direct' });
  });

  it('keeps global feature flags outside automatic tenant scoping', () => {
    expect(getTenantScopeRule('FeatureFlag')).toBeUndefined();
  });

  it('reports schema-backed tenant coverage diagnostics', () => {
    const diagnostics = getTenantScopeDiagnostics(new Date('2026-01-01T00:00:00Z'));

    expect(diagnostics.uncoveredClinicIdModels).toEqual([]);
    expect(diagnostics.staleRelationRules).toEqual([]);
    expect(diagnostics.excludedClinicIdModels).toContain('FeatureFlag');
    expect(diagnostics.directScopedModels).toBeGreaterThan(0);
    expect(diagnostics.relationScopedModels).toBeGreaterThan(0);
    expect(diagnostics.rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ model: 'Patient', kind: 'direct' }),
        expect.objectContaining({ model: 'Medication', kind: 'relation' }),
      ]),
    );
  });

  it('covers high-risk indirect PHI models through relation paths', () => {
    expect(getTenantScopeRule('Medication')).toEqual({
      kind: 'relation',
      path: ['prescription', 'patient'],
    });
    expect(getTenantScopeRule('Diagnosis')).toEqual({
      kind: 'relation',
      path: ['appointment'],
    });
    expect(getTenantScopeRule('PatientMetricValue')).toEqual({
      kind: 'relation',
      path: ['metricRecord'],
    });
  });

  it('applies direct tenant filters to reads and writes', () => {
    const scoped = applyTenantScopeForTest(
      'Patient',
      'findMany',
      { where: { clinicId: 'other-clinic', deletedAt: null } },
      'clinic-1',
    );

    expect(scoped.where).toEqual({
      clinicId: 'clinic-1',
      deletedAt: null,
    });
  });

  it('injects direct clinic ids into createMany payloads when clinicId is omitted', () => {
    const scoped = applyTenantScopeForTest(
      'SubscriptionReminder',
      'createMany',
      {
        data: [
          { type: 'trial', channel: 'IN_APP' },
          { type: 'renewal', channel: 'EMAIL' },
        ],
      },
      'clinic-1',
    );

    expect(scoped.data).toEqual([
      { clinicId: 'clinic-1', type: 'trial', channel: 'IN_APP' },
      { clinicId: 'clinic-1', type: 'renewal', channel: 'EMAIL' },
    ]);
  });

  it('rejects createMany payloads that explicitly target another clinic', () => {
    expect(() =>
      applyTenantScopeForTest(
        'SubscriptionReminder',
        'createMany',
        {
          data: [
            { clinicId: 'other-clinic', type: 'trial', channel: 'IN_APP' },
            { type: 'renewal', channel: 'EMAIL' },
          ],
        },
        'clinic-1',
      ),
    ).toThrow(/Attempted to write tenant-scoped data/);
  });

  it('adds relation tenant filters without overwriting existing predicates', () => {
    const scoped = applyTenantScopeForTest(
      'Diagnosis',
      'findFirst',
      { where: { isPrimary: true } },
      'clinic-1',
    );

    expect(scoped.where).toEqual({
      isPrimary: true,
      AND: [{ appointment: { clinicId: 'clinic-1' } }],
    });
  });

  it('rejects unsafe unique operations unless explicitly tenant-qualified', () => {
    expect(() =>
      applyTenantScopeForTest(
        'Patient',
        'findUnique',
        { where: { id: 'p1' } },
        'clinic-1',
      ),
    ).toThrow(/must include 'clinicId' in 'where'/);

    expect(() =>
      applyTenantScopeForTest(
        'Patient',
        'update',
        { where: { id: 'p1' }, data: { firstName: 'A' } },
        'clinic-1',
      ),
    ).toThrow(/must include 'clinicId' in 'where'/);

    expect(() =>
      applyTenantScopeForTest(
        'Patient',
        'delete',
        { where: { id: 'p1' } },
        'clinic-1',
      ),
    ).toThrow(/must include 'clinicId' in 'where'/);
  });

  it('rejects unsafe unique operations when tenant does not match', () => {
    expect(() =>
      applyTenantScopeForTest(
        'Patient',
        'findUnique',
        { where: { id: 'p1', clinicId: 'other-clinic' } },
        'clinic-1',
      ),
    ).toThrow(/while in tenant 'clinic-1'/);
  });

  it('allows unsafe unique operations when explicitly tenant-qualified', () => {
    const scoped = applyTenantScopeForTest(
      'Patient',
      'findUnique',
      { where: { id: 'p1', clinicId: 'clinic-1' } },
      'clinic-1',
    );

    expect(scoped.where).toEqual({ id: 'p1', clinicId: 'clinic-1' });
  });

  it('rejects indirect tenant-scoped models for unsafe unique operations', () => {
    expect(() =>
      applyTenantScopeForTest(
        'Diagnosis',
        'findUnique',
        { where: { id: 'd1', clinicId: 'clinic-1' } },
        'clinic-1',
      ),
    ).toThrow(/not allowed on indirectly tenant-scoped model/);
  });

  it('treats User as tenant-scoped (pre-tenant flows must not bypass this implicitly)', () => {
    expect(getTenantScopeRule('User')).toEqual({ kind: 'direct' });
  });
});
