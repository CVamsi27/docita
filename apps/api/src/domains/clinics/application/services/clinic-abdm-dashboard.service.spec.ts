import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { ClinicPersistencePort } from '@/domains/clinics/application/ports/clinic-persistence.port';
import type { ExternalIntegrationsConfigService } from '@/shared/modules/config/external-integrations-config.service';
import { ClinicAbdmDashboardService } from './clinic-abdm-dashboard.service';

describe('ClinicAbdmDashboardService', () => {
  const countDelegates = {
    patient: { count: jest.fn() },
    user: { count: jest.fn() },
    labTestOrder: { count: jest.fn() },
    medicalDocument: { count: jest.fn() },
    prescription: { count: jest.fn() },
    appointment: { count: jest.fn() },
    invoice: { count: jest.fn() },
  };
  const persistence = {
    clinic: { findUnique: jest.fn() },
    ...countDelegates,
  } as unknown as jest.Mocked<ClinicPersistencePort>;
  const integrationsConfig = {
    getAbdmConfig: jest.fn(),
  } as unknown as jest.Mocked<ExternalIntegrationsConfigService>;

  const service = new ClinicAbdmDashboardService(
    persistence,
    integrationsConfig,
    { now: () => new Date('2026-06-12T10:00:00.000Z') },
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (persistence.clinic.findUnique as jest.Mock).mockResolvedValue({
      abdmEnabled: true,
      hfrFacilityId: 'HFR-123',
    } as never);
    integrationsConfig.getAbdmConfig.mockReturnValue({
      baseUrl: 'https://dev.abdm.gov.in',
      clientId: 'client',
      clientSecret: 'secret',
      callbackSecret: 'callback-secret',
      enabled: true,
    });
  });

  it('returns readiness and applies DHIS threshold deduction to lowest-value records first', async () => {
    (persistence.patient.count as jest.Mock)
      .mockResolvedValueOnce(220 as never)
      .mockResolvedValueOnce(180 as never);
    (persistence.user.count as jest.Mock)
      .mockResolvedValueOnce(4 as never)
      .mockResolvedValueOnce(0 as never);
    (persistence.labTestOrder.count as jest.Mock).mockResolvedValueOnce(
      70 as never,
    );
    (persistence.medicalDocument.count as jest.Mock)
      .mockResolvedValueOnce(30 as never)
      .mockResolvedValueOnce(50 as never);
    (persistence.prescription.count as jest.Mock).mockResolvedValueOnce(
      80 as never,
    );
    (persistence.appointment.count as jest.Mock).mockResolvedValueOnce(
      20 as never,
    );
    (persistence.invoice.count as jest.Mock).mockResolvedValueOnce(10 as never);

    const result = await service.getDashboard('clinic-1');

    expect(result.abdmEnabled).toBe(true);
    expect(result.environmentConfigured).toBe(true);
    expect(result.hfrConfigured).toBe(true);
    expect(result.m1Status).toBe('READY');
    expect(result.m2Status).toBe('PENDING');
    expect(result.m3Status).toBe('PENDING');
    expect(result.readinessItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'TENANT_ENABLEMENT',
          status: 'READY',
        }),
        expect.objectContaining({
          key: 'CALLBACK_SECURITY',
          status: 'READY',
        }),
        expect.objectContaining({ key: 'PHI_LOGGING', status: 'READY' }),
      ]),
    );
    expect(result.dhisEstimate.month).toBe('2026-06');
    expect(result.dhisEstimate.category1Count).toBe(100);
    expect(result.dhisEstimate.category2Count).toBe(160);
    expect(result.dhisEstimate.recordsAboveThreshold).toBe(160);
    expect(result.dhisEstimate.estimatedFacilityIncentivePaise).toBe(130_000);
    expect(result.dhisEstimate.estimatedDscIncentivePaise).toBe(65_000);
  });

  it('marks credentials and HFR as blockers when configuration is missing', async () => {
    (persistence.clinic.findUnique as jest.Mock).mockResolvedValue({
      abdmEnabled: true,
      hfrFacilityId: null,
    } as never);
    integrationsConfig.getAbdmConfig.mockReturnValue({
      baseUrl: null,
      clientId: null,
      clientSecret: null,
      callbackSecret: null,
      enabled: false,
    });
    (persistence.patient.count as jest.Mock)
      .mockResolvedValueOnce(3 as never)
      .mockResolvedValueOnce(0 as never);
    (persistence.user.count as jest.Mock)
      .mockResolvedValueOnce(0 as never)
      .mockResolvedValueOnce(2 as never);
    (persistence.labTestOrder.count as jest.Mock).mockResolvedValueOnce(
      0 as never,
    );
    (persistence.medicalDocument.count as jest.Mock)
      .mockResolvedValueOnce(0 as never)
      .mockResolvedValueOnce(0 as never);
    (persistence.prescription.count as jest.Mock).mockResolvedValueOnce(
      0 as never,
    );
    (persistence.appointment.count as jest.Mock).mockResolvedValueOnce(
      0 as never,
    );
    (persistence.invoice.count as jest.Mock).mockResolvedValueOnce(0 as never);

    const result = await service.getDashboard('clinic-1');

    expect(result.m1Status).toBe('PENDING');
    expect(result.readinessItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'PLATFORM_CREDENTIALS',
          status: 'BLOCKED',
        }),
        expect.objectContaining({
          key: 'CALLBACK_SECURITY',
          status: 'BLOCKED',
        }),
        expect.objectContaining({ key: 'HFR_FACILITY', status: 'PENDING' }),
      ]),
    );
  });

  it('marks ABDM as blocked when the facility switch is off', async () => {
    (persistence.clinic.findUnique as jest.Mock).mockResolvedValue({
      abdmEnabled: false,
      hfrFacilityId: 'HFR-123',
    } as never);
    (persistence.patient.count as jest.Mock)
      .mockResolvedValueOnce(10 as never)
      .mockResolvedValueOnce(8 as never);
    (persistence.user.count as jest.Mock)
      .mockResolvedValueOnce(2 as never)
      .mockResolvedValueOnce(0 as never);
    (persistence.labTestOrder.count as jest.Mock).mockResolvedValueOnce(
      0 as never,
    );
    (persistence.medicalDocument.count as jest.Mock)
      .mockResolvedValueOnce(0 as never)
      .mockResolvedValueOnce(0 as never);
    (persistence.prescription.count as jest.Mock).mockResolvedValueOnce(
      0 as never,
    );
    (persistence.appointment.count as jest.Mock).mockResolvedValueOnce(
      0 as never,
    );
    (persistence.invoice.count as jest.Mock).mockResolvedValueOnce(0 as never);

    const result = await service.getDashboard('clinic-1');

    expect(result.abdmEnabled).toBe(false);
    expect(result.m1Status).toBe('PENDING');
    expect(result.m2Status).toBe('PLANNED');
    expect(result.readinessItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'TENANT_ENABLEMENT',
          status: 'BLOCKED',
        }),
      ]),
    );
  });
});
