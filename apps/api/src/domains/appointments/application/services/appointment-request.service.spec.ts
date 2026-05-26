import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AppointmentRequestStatus } from '@workspace/db';
import { AppointmentRequestService } from './appointment-request.service';
import { AppointmentRequestCommandService } from './appointment-request-command.service';
import { AppointmentRequestQueryService } from './appointment-request-query.service';
import { AppointmentService } from './appointment.service';
import { APPOINTMENT_REQUEST_REPOSITORY_TOKEN } from '@/domains/appointments/core/repositories/appointment-request.repository.interface';
import { StaffNotificationService } from '@/domains/whatsapp/application/services/staff-notification.service';

describe('AppointmentRequestService', () => {
  let service: AppointmentRequestService;
  let appointmentRequestRepository: Record<
    string,
    jest.Mock<(...args: unknown[]) => Promise<unknown>>
  >;
  let appointmentService: {
    createAppointment: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  };
  let staffNotifications: {
    notifyStaff: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  };

  const mockRequest = {
    id: 'request-1',
    patientId: 'patient-1',
    clinicId: 'clinic-1',
    preferredDoctorId: null,
    preferredDate: new Date('2026-05-01T00:00:00.000Z'),
    preferredTime: '10:00',
    reason: 'Fever',
    notes: 'Morning preferred',
    status: AppointmentRequestStatus.PENDING,
    reviewedById: null,
    reviewedAt: null,
    responseMessage: null,
    createdAt: new Date('2026-04-30T00:00:00.000Z'),
    updatedAt: new Date('2026-04-30T00:00:00.000Z'),
    patient: {
      id: 'patient-1',
      firstName: 'Asha',
      lastName: 'Kumar',
      phoneNumber: '9999999999',
    },
    preferredDoctor: null,
    reviewedBy: null,
  };

  beforeEach(async () => {
    appointmentRequestRepository = {
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findForClinic: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findByIdAndClinic: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      markReviewed: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findMatchingAppointment:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      doctorBelongsToClinic:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    };
    appointmentService = {
      createAppointment: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    };
    staffNotifications = {
      notifyStaff: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentRequestCommandService,
        AppointmentRequestQueryService,
        AppointmentRequestService,
        {
          provide: APPOINTMENT_REQUEST_REPOSITORY_TOKEN,
          useValue: appointmentRequestRepository,
        },
        { provide: AppointmentService, useValue: appointmentService },
        { provide: StaffNotificationService, useValue: staffNotifications },
      ],
    }).compile();

    service = module.get<AppointmentRequestService>(AppointmentRequestService);
  });

  it('creates a patient appointment request scoped to the clinic', async () => {
    appointmentRequestRepository.create.mockResolvedValue(mockRequest);

    const result = await service.createPatientRequest('patient-1', 'clinic-1', {
      preferredDate: '2026-05-01',
      preferredTime: '10:00',
      reason: 'Fever',
      notes: 'Morning preferred',
    });

    expect(appointmentRequestRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: 'patient-1',
        clinicId: 'clinic-1',
        reason: 'Fever',
      }),
    );
    expect(staffNotifications.notifyStaff).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicId: 'clinic-1',
        type: 'APPOINTMENT_REQUEST_CREATED',
        priority: 'HIGH',
        sendWhatsApp: false,
        sendInApp: true,
      }),
    );
    expect(result.status).toBe(AppointmentRequestStatus.PENDING);
  });

  it('rejects preferred doctors outside the clinic', async () => {
    appointmentRequestRepository.doctorBelongsToClinic.mockResolvedValue(false);

    await expect(
      service.createPatientRequest('patient-1', 'clinic-1', {
        preferredDoctorId: 'doctor-1',
        preferredDate: '2026-05-01',
        reason: 'Fever',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('approves a pending request by creating an appointment and marking it reviewed', async () => {
    appointmentRequestRepository.findByIdAndClinic.mockResolvedValue(
      mockRequest,
    );
    appointmentRequestRepository.doctorBelongsToClinic.mockResolvedValue(true);
    appointmentRequestRepository.findMatchingAppointment.mockResolvedValue(
      null,
    );
    appointmentService.createAppointment.mockResolvedValue({ id: 'appt-1' });
    appointmentRequestRepository.markReviewed.mockResolvedValue({
      ...mockRequest,
      status: AppointmentRequestStatus.APPROVED,
      reviewedById: 'user-1',
    });

    const result = await service.approveRequest(
      'request-1',
      'clinic-1',
      'user-1',
      {
        doctorId: 'doctor-1',
        startTime: '2026-05-01T10:00:00.000Z',
        endTime: '2026-05-01T10:30:00.000Z',
      },
    );

    expect(appointmentService.createAppointment).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicId: 'clinic-1',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
      }),
    );
    expect(appointmentRequestRepository.markReviewed).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'request-1',
        clinicId: 'clinic-1',
        status: AppointmentRequestStatus.APPROVED,
        reviewedById: 'user-1',
        responseMessage: 'Booked appointment appt-1',
      }),
    );
    expect(staffNotifications.notifyStaff).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicId: 'clinic-1',
        type: 'APPOINTMENT_REQUEST_APPROVED',
        sendWhatsApp: false,
        sendInApp: true,
      }),
    );
    expect(result.status).toBe(AppointmentRequestStatus.APPROVED);
  });

  it('approves a request even when the staff notification fails', async () => {
    appointmentRequestRepository.findByIdAndClinic.mockResolvedValue(
      mockRequest,
    );
    appointmentRequestRepository.doctorBelongsToClinic.mockResolvedValue(true);
    appointmentRequestRepository.findMatchingAppointment.mockResolvedValue(
      null,
    );
    appointmentService.createAppointment.mockResolvedValue({ id: 'appt-1' });
    appointmentRequestRepository.markReviewed.mockResolvedValue({
      ...mockRequest,
      status: AppointmentRequestStatus.APPROVED,
      reviewedById: 'user-1',
    });
    staffNotifications.notifyStaff.mockRejectedValue(new Error('send failed'));

    const result = await service.approveRequest(
      'request-1',
      'clinic-1',
      'user-1',
      {
        doctorId: 'doctor-1',
        startTime: '2026-05-01T10:00:00.000Z',
        endTime: '2026-05-01T10:30:00.000Z',
      },
    );

    expect(result.status).toBe(AppointmentRequestStatus.APPROVED);
  });

  it('marks a request approved when the appointment already exists for the selected slot', async () => {
    appointmentRequestRepository.findByIdAndClinic.mockResolvedValue(
      mockRequest,
    );
    appointmentRequestRepository.doctorBelongsToClinic.mockResolvedValue(true);
    appointmentRequestRepository.findMatchingAppointment.mockResolvedValue({
      id: 'appt-existing',
    });
    appointmentRequestRepository.markReviewed.mockResolvedValue({
      ...mockRequest,
      status: AppointmentRequestStatus.APPROVED,
      reviewedById: 'user-1',
    });

    const result = await service.approveRequest(
      'request-1',
      'clinic-1',
      'user-1',
      {
        doctorId: 'doctor-1',
        startTime: '2026-05-01T10:00:00.000Z',
        endTime: '2026-05-01T10:30:00.000Z',
      },
    );

    expect(appointmentService.createAppointment).not.toHaveBeenCalled();
    expect(appointmentRequestRepository.markReviewed).toHaveBeenCalledWith(
      expect.objectContaining({
        responseMessage: 'Booked appointment appt-existing',
      }),
    );
    expect(result.status).toBe(AppointmentRequestStatus.APPROVED);
  });

  it('does not approve a request that is no longer pending', async () => {
    appointmentRequestRepository.findByIdAndClinic.mockResolvedValue({
      ...mockRequest,
      status: AppointmentRequestStatus.REJECTED,
    });

    await expect(
      service.approveRequest('request-1', 'clinic-1', 'user-1', {
        doctorId: 'doctor-1',
        startTime: '2026-05-01T10:00:00.000Z',
        endTime: '2026-05-01T10:30:00.000Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when reviewing a missing request', async () => {
    appointmentRequestRepository.findByIdAndClinic.mockResolvedValue(null);

    await expect(
      service.rejectRequest('request-1', 'clinic-1', 'user-1', {
        responseMessage: 'Please call reception.',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
