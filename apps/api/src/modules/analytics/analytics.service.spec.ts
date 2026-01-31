import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { FinancialAnalyticsFactory } from './factories/financial-analytics.factory';
import { ClinicalAnalyticsFactory } from './factories/clinical-analytics.factory';
import { OperationalAnalyticsFactory } from './factories/operational-analytics.factory';
import { SnapshotAnalyticsFactory } from './factories/snapshot-analytics.factory';
import { DEFAULT_TIMEZONE } from '@workspace/utils';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let financialFactory: FinancialAnalyticsFactory;

  const mockFactory = {
    getOverview: jest.fn(),
    getRevenueTrends: jest.fn(),
    getTopDiagnoses: jest.fn(),
    createAnalyticsSnapshot: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: FinancialAnalyticsFactory, useValue: mockFactory },
        { provide: ClinicalAnalyticsFactory, useValue: mockFactory },
        { provide: OperationalAnalyticsFactory, useValue: mockFactory },
        { provide: SnapshotAnalyticsFactory, useValue: mockFactory },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    financialFactory = module.get<FinancialAnalyticsFactory>(
      FinancialAnalyticsFactory,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should delegate getRevenueTrends to FinancialAnalyticsFactory', async () => {
    const clinicId = 'clinic-1';
    await service.getRevenueTrends(clinicId);
    expect(financialFactory.getRevenueTrends).toHaveBeenCalledWith(
      clinicId,
      'daily',
      30,
      DEFAULT_TIMEZONE,
    );
  });
});
