import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PublicBookingSlotsService } from './public-booking-slots.service';
import {
  PUBLIC_BOOKING_PERSISTENCE_PORT,
  type PublicBookingPersistencePort,
} from '@/domains/public-booking/application/ports/public-booking-persistence.port';
import { DoctorsService } from '@/domains/doctors/application/services/doctors.service';
import { SlotGenerationService } from '@/domains/doctors/application/services/slot-generation.service';

const CLINIC = {
  id: 'clinic-1',
  name: 'Docita Clinic',
  referralCode: 'DOCITA1',
  timezone: 'Asia/Kolkata',
  address: '1 St',
  phone: '+919812345678',
  email: 'c@x.test',
  website: null,
  facilityType: 'CLINIC',
  settings: {},
};

type MockFn = jest.Mock<(...args: unknown[]) => Promise<unknown>>;

describe('PublicBookingSlotsService', () => {
  let service: PublicBookingSlotsService;
  let persistence: Record<string, Record<string, MockFn>>;
  let doctorsService: { findAll: MockFn };
  let slotGeneration: {
    getAvailableSlotsWithMeta: MockFn;
    getAvailableSlots: MockFn;
  };

  beforeEach(async () => {
    persistence = {
      clinic: {
        findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      },
      user: { count: jest.fn<(...args: unknown[]) => Promise<unknown>>() },
      doctorClinic: {
        count: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      },
    };
    doctorsService = {
      findAll: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    };
    slotGeneration = {
      getAvailableSlotsWithMeta:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      getAvailableSlots: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicBookingSlotsService,
        {
          provide: PUBLIC_BOOKING_PERSISTENCE_PORT,
          useValue: persistence as unknown as PublicBookingPersistencePort,
        },
        { provide: DoctorsService, useValue: doctorsService },
        { provide: SlotGenerationService, useValue: slotGeneration },
      ],
    }).compile();

    service = module.get<PublicBookingSlotsService>(PublicBookingSlotsService);
    persistence.clinic.findFirst.mockResolvedValue(CLINIC);
  });

  describe('buildSlotStartDate / buildSlotIso', () => {
    it('converts clinic-wall time to a UTC instant in the clinic timezone', () => {
      const instant = service.buildSlotStartDate(
        '2026-05-01',
        '10:00',
        'Asia/Kolkata',
      );
      expect(instant.toISOString()).toBe('2026-05-01T04:30:00.000Z');
    });

    it('buildSlotIso returns the ISO string form', () => {
      expect(service.buildSlotIso('2026-05-01', '09:00', 'Asia/Kolkata')).toBe(
        '2026-05-01T03:30:00.000Z',
      );
    });

    it('throws BadRequestException for an unparseable wall time', () => {
      expect(() =>
        service.buildSlotStartDate('2026-05-01', '25:00', 'Asia/Kolkata'),
      ).toThrow(BadRequestException);
      expect(() =>
        service.buildSlotStartDate('2026-05-01', 'not-a-time', 'Asia/Kolkata'),
      ).toThrow(BadRequestException);
    });
  });

  describe('listDoctors', () => {
    it('maps the clinic doctors, dropping null specializations', async () => {
      doctorsService.findAll.mockResolvedValue([
        { id: 'doc-1', name: 'Dr Asha', specialization: 'Cardiology' },
        { id: 'doc-2', name: 'Dr Ram', specialization: null },
      ]);

      const result = await service.listDoctors('docita1');
      expect(result).toEqual({
        doctors: [
          { id: 'doc-1', name: 'Dr Asha', specialization: 'Cardiology' },
          { id: 'doc-2', name: 'Dr Ram' },
        ],
      });
      expect(doctorsService.findAll).toHaveBeenCalledWith('clinic-1');
    });
  });

  describe('listSlots', () => {
    it('rejects a malformed query with BadRequestException', async () => {
      await expect(
        service.listSlots('docita1', { date: 'not-a-date' }),
      ).rejects.toThrow(BadRequestException);
      await expect(service.listSlots('docita1', {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a doctor that neither works at nor is linked to the clinic', async () => {
      (persistence.user.count as MockFn).mockResolvedValue(0);
      (persistence.doctorClinic.count as MockFn).mockResolvedValue(0);

      await expect(
        service.listSlots('docita1', { doctorId: 'doc-9', date: '2026-05-01' }),
      ).rejects.toThrow('Doctor is not available at this clinic');
      expect(persistence.user.count).toHaveBeenCalledWith({
        where: {
          id: 'doc-9',
          clinicId: 'clinic-1',
          role: { in: ['DOCTOR', 'ADMIN_DOCTOR'] },
          deletedAt: null,
        },
      });
      expect(persistence.doctorClinic.count).toHaveBeenCalledWith({
        where: {
          doctorId: 'doc-9',
          clinicId: 'clinic-1',
          active: true,
          doctor: { deletedAt: null },
        },
      });
    });

    it('accepts a doctor linked via an active doctorClinic row', async () => {
      (persistence.user.count as MockFn).mockResolvedValue(0);
      (persistence.doctorClinic.count as MockFn).mockResolvedValue(1);
      slotGeneration.getAvailableSlotsWithMeta.mockResolvedValue({
        slots: [
          {
            time: '09:00',
            endTime: '09:30',
            doctorId: 'doc-1',
            doctorName: 'Dr Asha',
            isAvailable: true,
          },
        ],
      });

      await service.listSlots('docita1', {
        doctorId: 'doc-1',
        date: '2026-05-01',
      });
      expect(slotGeneration.getAvailableSlotsWithMeta).toHaveBeenCalledWith(
        'clinic-1',
        '2026-05-01',
        'doc-1',
      );
    });

    it("treats doctorId 'any' as no doctor filter and skips the membership check", async () => {
      slotGeneration.getAvailableSlotsWithMeta.mockResolvedValue({ slots: [] });

      await service.listSlots('docita1', {
        doctorId: 'any',
        date: '2026-05-01',
      });
      expect(persistence.user.count).not.toHaveBeenCalled();
      expect(slotGeneration.getAvailableSlotsWithMeta).toHaveBeenCalledWith(
        'clinic-1',
        '2026-05-01',
        undefined,
      );
    });

    it('maps slots to UTC instants, applies the range filter, and forwards the empty reason', async () => {
      slotGeneration.getAvailableSlotsWithMeta.mockResolvedValue({
        slots: [
          {
            time: '09:00',
            endTime: '09:30',
            doctorId: 'doc-1',
            doctorName: 'Dr Asha',
            specialization: 'Cardiology',
            isAvailable: true,
          },
          {
            time: '10:00',
            endTime: '10:30',
            doctorId: 'doc-1',
            doctorName: 'Dr Asha',
            isAvailable: false,
          },
        ],
      });

      const result = await service.listSlots('docita1', {
        doctorId: 'any',
        date: '2026-05-01',
        rangeStart: '09:30',
        rangeEnd: '10:00',
      });

      // 09:00 < 09:30 (excluded) and 10:30 > 10:00 (excluded) -> nothing left.
      expect(result).toEqual({
        slots: [],
      });
    });

    it('maps surviving slots and includes the empty reason only when empty', async () => {
      slotGeneration.getAvailableSlotsWithMeta.mockResolvedValue({
        slots: [
          {
            time: '10:00',
            endTime: '10:30',
            doctorId: 'doc-1',
            doctorName: 'Dr Asha',
            isAvailable: true,
          },
        ],
      });

      const result = await service.listSlots('docita1', {
        doctorId: 'any',
        date: '2026-05-01',
        rangeStart: '09:30',
      });
      expect(result).toEqual({
        slots: [
          {
            doctorId: 'doc-1',
            doctorName: 'Dr Asha',
            startTime: '2026-05-01T04:30:00.000Z',
            endTime: '2026-05-01T05:00:00.000Z',
            isAvailable: true,
          },
        ],
      });
      expect(result).not.toHaveProperty('slotListEmptyReason');

      slotGeneration.getAvailableSlotsWithMeta.mockResolvedValue({
        slots: [],
        slotListEmptyReason: 'NO_WEEKLY_HOURS',
      });
      const empty = await service.listSlots('docita1', {
        doctorId: 'any',
        date: '2026-05-01',
      });
      expect(empty).toEqual({
        slots: [],
        slotListEmptyReason: 'NO_WEEKLY_HOURS',
      });
    });
  });

  describe('assertRequestedSlotIsPubliclyBookable', () => {
    const tz = 'Asia/Kolkata';

    it('accepts a requested slot that matches an available slot exactly', async () => {
      slotGeneration.getAvailableSlots.mockResolvedValue([
        {
          time: '10:00',
          endTime: '10:30',
          doctorId: 'doc-1',
          doctorName: 'Dr Asha',
          isAvailable: true,
        },
      ]);

      await expect(
        service.assertRequestedSlotIsPubliclyBookable(
          'clinic-1',
          'doc-1',
          '2026-05-01',
          service.buildSlotStartDate('2026-05-01', '10:00', tz),
          service.buildSlotStartDate('2026-05-01', '10:30', tz),
          tz,
        ),
      ).resolves.toBeUndefined();
    });

    it('accepts a match within the 120s tolerance window', async () => {
      slotGeneration.getAvailableSlots.mockResolvedValue([
        {
          time: '10:00',
          endTime: '10:30',
          doctorId: 'doc-1',
          doctorName: 'Dr Asha',
          isAvailable: true,
        },
      ]);
      const requestedStart = new Date(
        service.buildSlotStartDate('2026-05-01', '10:00', tz).getTime() +
          60_000,
      );
      const requestedEnd = new Date(
        service.buildSlotStartDate('2026-05-01', '10:30', tz).getTime() -
          60_000,
      );

      await expect(
        service.assertRequestedSlotIsPubliclyBookable(
          'clinic-1',
          'doc-1',
          '2026-05-01',
          requestedStart,
          requestedEnd,
          tz,
        ),
      ).resolves.toBeUndefined();
    });

    it('rejects a requested slot outside the 120s tolerance', async () => {
      slotGeneration.getAvailableSlots.mockResolvedValue([
        {
          time: '10:00',
          endTime: '10:30',
          doctorId: 'doc-1',
          doctorName: 'Dr Asha',
          isAvailable: true,
        },
      ]);
      const requestedStart = new Date(
        service.buildSlotStartDate('2026-05-01', '10:00', tz).getTime() +
          121_000,
      );

      await expect(
        service.assertRequestedSlotIsPubliclyBookable(
          'clinic-1',
          'doc-1',
          '2026-05-01',
          requestedStart,
          service.buildSlotStartDate('2026-05-01', '10:30', tz),
          tz,
        ),
      ).rejects.toThrow('Selected slot is no longer available');
    });

    it('rejects an unavailable slot even when the wall times match', async () => {
      slotGeneration.getAvailableSlots.mockResolvedValue([
        {
          time: '10:00',
          endTime: '10:30',
          doctorId: 'doc-1',
          doctorName: 'Dr Asha',
          isAvailable: false,
        },
      ]);

      await expect(
        service.assertRequestedSlotIsPubliclyBookable(
          'clinic-1',
          'doc-1',
          '2026-05-01',
          service.buildSlotStartDate('2026-05-01', '10:00', tz),
          service.buildSlotStartDate('2026-05-01', '10:30', tz),
          tz,
        ),
      ).rejects.toThrow('Selected slot is no longer available');
    });

    it('rejects a slot belonging to a different doctor', async () => {
      slotGeneration.getAvailableSlots.mockResolvedValue([
        {
          time: '10:00',
          endTime: '10:30',
          doctorId: 'doc-2',
          doctorName: 'Dr Ram',
          isAvailable: true,
        },
      ]);

      await expect(
        service.assertRequestedSlotIsPubliclyBookable(
          'clinic-1',
          'doc-1',
          '2026-05-01',
          service.buildSlotStartDate('2026-05-01', '10:00', tz),
          service.buildSlotStartDate('2026-05-01', '10:30', tz),
          tz,
        ),
      ).rejects.toThrow('Selected slot is no longer available');
    });
  });
});
