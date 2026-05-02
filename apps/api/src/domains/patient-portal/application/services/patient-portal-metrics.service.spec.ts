import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from '@/prisma/prisma.service';
import { PatientPortalMetricsService } from './patient-portal-metrics.service';
import { CreatePatientMetricValueDto } from '@/domains/patients/application/dto/patient-metrics.dto';
import { PatientMetricsService } from '@/domains/patients/application/services/patientMetrics.service';
import { asType } from '@/test-utils';

describe('PatientPortalMetricsService', () => {
  type MetricCategory = {
    metricDefinitions: Array<{
      id: string;
      isTracked: boolean;
      isTrackedByDefault: boolean;
    }>;
  };
  type MetricValueResult = { id: string };

  let service: PatientPortalMetricsService;
  let prisma: {
    runUnrestricted: jest.Mock;
  };
  let patientMetricsService: {
    listCategories: jest.MockedFunction<
      (clinicId: string, patientId: string) => Promise<MetricCategory[]>
    >;
    recordMetricValue: jest.MockedFunction<
      (
        clinicId: string,
        patientId: string,
        userId: string | undefined,
        dto: CreatePatientMetricValueDto,
      ) => Promise<MetricValueResult>
    >;
  };

  beforeEach(() => {
    prisma = {
      runUnrestricted: jest
        .fn()
        .mockImplementation((callback: unknown) =>
          (callback as () => Promise<MetricCategory[] | MetricValueResult>)(),
        ),
    };

    patientMetricsService = {
      listCategories: jest.fn(),
      recordMetricValue: jest.fn(),
    };

    service = new PatientPortalMetricsService(
      asType<PrismaService>(prisma),
      asType<PatientMetricsService>(patientMetricsService),
    );
  });

  it('executes category listing in unrestricted context', async () => {
    const categories: MetricCategory[] = [
      {
        metricDefinitions: [
          { id: 'metric-1', isTracked: true, isTrackedByDefault: false },
        ],
      },
    ];
    patientMetricsService.listCategories.mockResolvedValue(categories);

    const result = await service.listCategories('clinic-1', 'patient-1');

    expect(prisma.runUnrestricted).toHaveBeenCalledTimes(1);
    expect(patientMetricsService.listCategories).toHaveBeenCalledWith(
      'clinic-1',
      'patient-1',
    );
    expect(result).toEqual(categories);
  });

  it('forces PATIENT_PORTAL source when recording metric value', async () => {
    patientMetricsService.recordMetricValue.mockResolvedValue({
      id: 'value-1',
    });

    const dto: CreatePatientMetricValueDto = {
      definitionId: 'metric-1',
      valueNumber: 98.6,
      source: 'MANUAL',
    };

    await service.recordMetricValue('clinic-1', 'patient-1', 'user-1', dto);

    expect(prisma.runUnrestricted).toHaveBeenCalledTimes(1);
    expect(patientMetricsService.recordMetricValue).toHaveBeenCalledWith(
      'clinic-1',
      'patient-1',
      'user-1',
      {
        ...dto,
        source: 'PATIENT_PORTAL',
      },
    );
  });
});
