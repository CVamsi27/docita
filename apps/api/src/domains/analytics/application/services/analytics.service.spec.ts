import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { FinancialAnalyticsFactory } from '@/domains/analytics/factories/financial-analytics.factory';
import { ClinicalAnalyticsFactory } from '@/domains/analytics/factories/clinical-analytics.factory';
import { OperationalAnalyticsFactory } from '@/domains/analytics/factories/operational-analytics.factory';
import { SnapshotAnalyticsFactory } from '@/domains/analytics/factories/snapshot-analytics.factory';
import { DEFAULT_TIMEZONE } from '@workspace/utils';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

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
