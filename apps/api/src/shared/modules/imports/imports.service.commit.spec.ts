import { Test, TestingModule } from '@nestjs/testing';
import { ImportsService } from './imports.service';
import { ImportPreviewService } from './import-preview.service';
import { PatientTabularImportService } from './patient-tabular-import.service';
import { ImportOcrWorkflowService } from './import-ocr-workflow.service';
import { OcrImportCommitService } from './ocr-import-commit.service';
import { PrismaService } from '@/prisma/prisma.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { OcrImportCommitRequest } from '@workspace/types';

describe('ImportsService.commitOcrImport', () => {
  let service: ImportsService;

  beforeEach(async () => {
    const tx = {
      patient: {
        create: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue({ id: 'patient-1' }),
      },
      appointment: {
        create: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue({ id: 'appt-1' }),
      },
      vitalSign: {
        create: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue({}),
      },
      prescription: {
        create: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue({ id: 'rx-1' }),
      },
      medication: {
        create: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue({}),
      },
      invoice: {
        create: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue({}),
      },
      consent: {
        create: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue({ id: 'consent-1' }),
      },
    };

    const prismaServiceMock: unknown = {
      clinic: {
        findUnique: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue({ id: 'clinic-1' }),
      },
      user: {
        findFirst: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue({ id: 'doc-1' }),
      },
      $transaction: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockImplementation(async (fn: unknown) =>
          (fn as (t: typeof tx) => Promise<unknown>)(tx),
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportsService,
        {
          provide: ImportPreviewService,
          useValue: {},
        },
        {
          provide: PatientTabularImportService,
          useValue: {},
        },
        {
          provide: ImportOcrWorkflowService,
          useValue: {},
        },
        OcrImportCommitService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock as PrismaService,
        },
        {
          provide: CLOCK_PORT,
          useValue: { now: () => new Date('2026-01-15T10:00:00Z') } satisfies IClock,
        },
      ],
    }).compile();

    service = module.get(ImportsService);
  });

  it('creates patient and appointment', async () => {
    const noticeVersion = 'dpdp-notice-test-v1';
    const dto: OcrImportCommitRequest = {
      clinicId: 'clinic-1',
      doctorId: 'doc-1',
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '5551234567',
      gender: 'FEMALE',
      dateOfBirth: new Date('1990-01-02').toISOString(),
      dpdpConsent: {
        accepted: true,
        noticeVersion,
        relation: 'SELF',
      },
    };

    const result = await service.commitOcrImport(dto, {
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
      createdBy: 'user-1',
      dpdpNoticeVersion: noticeVersion,
    });
    expect(result.patientId).toBe('patient-1');
    expect(result.appointmentId).toBe('appt-1');
  });
});
