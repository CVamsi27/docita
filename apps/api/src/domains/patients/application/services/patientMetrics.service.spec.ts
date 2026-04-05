import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PatientMetricsService } from './patientMetrics.service';
import {
  IPatientMetricsRepository,
  PATIENT_METRICS_REPOSITORY_TOKEN,
} from '@/domains/patients/core/repositories/patient-metrics.repository.interface';

describe('PatientMetricsService', () => {
  let service: PatientMetricsService;
  let repository: jest.Mocked<IPatientMetricsRepository>;

  const repositoryMock = {
    findCategories: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    findSelections: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    createCategory: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    findActiveCategory: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    createDefinition: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    findDefinitionsForSelections:
      jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    upsertSelectionsBatch: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    findDefinitions: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    findActiveDefinition: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    createMetricRecord: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    findMetricHistory: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientMetricsService,
        {
          provide: PATIENT_METRICS_REPOSITORY_TOKEN,
          useValue: repositoryMock,
        },
      ],
    }).compile();

    service = module.get<PatientMetricsService>(PatientMetricsService);
    repository = module.get(PATIENT_METRICS_REPOSITORY_TOKEN);
    jest.clearAllMocks();
  });

  it('uses repository batch upsert for metric selections', async () => {
    repository.findDefinitionsForSelections.mockResolvedValue([
      { id: 'def-1' },
      { id: 'def-2' },
    ]);
    repository.findDefinitions.mockResolvedValue([
      {
        id: 'def-1',
        key: 'key-1',
        label: 'Label 1',
        isTrackedByDefault: false,
        category: { id: 'cat-1', key: 'cat-1', name: 'Category 1' },
      },
    ]);
    repository.findSelections.mockResolvedValue([
      { definitionId: 'def-1', isTracked: true },
    ]);

    await service.upsertSelections('clinic-1', 'patient-1', {
      items: [
        { definitionId: 'def-1', isTracked: true },
        { definitionId: 'def-2', isTracked: false },
      ],
    });

    expect(repository.upsertSelectionsBatch).toHaveBeenCalledTimes(1);
    expect(repository.upsertSelectionsBatch).toHaveBeenCalledWith(
      'clinic-1',
      'patient-1',
      {
        items: [
          { definitionId: 'def-1', isTracked: true },
          { definitionId: 'def-2', isTracked: false },
        ],
      },
    );
  });

  it('throws BadRequestException when an invalid definition id is supplied', async () => {
    repository.findDefinitionsForSelections.mockResolvedValue([
      { id: 'def-1' },
    ]);

    await expect(
      service.upsertSelections('clinic-1', 'patient-1', {
        items: [{ definitionId: 'invalid-def', isTracked: true }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.upsertSelectionsBatch).not.toHaveBeenCalled();
  });
});
