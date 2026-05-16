import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { AppointmentQueryService } from './appointment-query.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Role } from '@workspace/db';

describe('AppointmentQueryService', () => {
  let service: AppointmentQueryService;
  let prisma: jest.Mocked<PrismaService>;
  let appointmentRepository: { findById: jest.Mock; findAll: jest.Mock };

  beforeEach(() => {
    appointmentRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
    };

    prisma = {
      clinic: { findUnique: jest.fn() },
    } as unknown as jest.Mocked<PrismaService>;

    service = new AppointmentQueryService(appointmentRepository as never, prisma);
  });

  describe('getAppointment', () => {
    it('should return appointment when found', async () => {
      const appointment = { id: 'appt-1', clinicId: 'clinic-1', doctorId: 'doc-1' };
      appointmentRepository.findById.mockResolvedValueOnce(appointment as never);

      const result = await service.getAppointment('appt-1', 'clinic-1');

      expect(result).toEqual(appointment);
    });

    it('should throw NotFoundException when appointment does not exist', async () => {
      appointmentRepository.findById.mockResolvedValueOnce(null as never);

      await expect(service.getAppointment('missing', 'clinic-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when doctor accesses another doctors appointment', async () => {
      const appointment = { id: 'appt-1', clinicId: 'clinic-1', doctorId: 'doc-2' };
      appointmentRepository.findById.mockResolvedValueOnce(appointment as never);

      await expect(
        service.getAppointment('appt-1', 'clinic-1', { role: Role.DOCTOR, userId: 'doc-1' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('listAppointments', () => {
    it('should list appointments for a clinic', async () => {
      const appointments = [
        { id: 'appt-1', clinicId: 'clinic-1' },
        { id: 'appt-2', clinicId: 'clinic-1' },
      ];
      appointmentRepository.findAll.mockResolvedValueOnce(appointments as never);

      const result = await service.listAppointments({ clinicId: 'clinic-1' });

      expect(result).toEqual(appointments);
      expect(appointmentRepository.findAll).toHaveBeenCalledWith(expect.objectContaining({ clinicId: 'clinic-1' }));
    });

    it('should resolve calendar picker date to UTC bounds', async () => {
      appointmentRepository.findAll.mockResolvedValueOnce([] as never);
      (prisma.clinic.findUnique as jest.Mock).mockResolvedValueOnce({ timezone: 'Asia/Kolkata' } as never);

      await service.listAppointments({ clinicId: 'clinic-1', calendarPickerDate: '2026-05-16' });

      expect(appointmentRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ clinicId: 'clinic-1', intersectCalendarRange: true }),
      );
    });

    it('should skip calendar bounds resolution when explicit date range is provided', async () => {
      const appointments = [{ id: 'appt-1', clinicId: 'clinic-1' }];
      appointmentRepository.findAll.mockResolvedValueOnce(appointments as never);

      await service.listAppointments({
        clinicId: 'clinic-1',
        startDate: new Date('2026-05-16T00:00:00Z'),
        endDate: new Date('2026-05-16T23:59:59Z'),
        calendarPickerDate: '2026-05-16',
      });

      expect(prisma.clinic.findUnique).not.toHaveBeenCalled();
    });
  });
});
