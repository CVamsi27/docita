import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DoctorClinicsService } from './doctor-clinics.service';
import {
  DOCTOR_CLINICS_REPOSITORY_TOKEN,
  IDoctorClinicsRepository,
} from '@/domains/doctor-clinics/application/ports/doctor-clinics.repository.port';

describe('DoctorClinicsService', () => {
  let service: DoctorClinicsService;
  let repository: IDoctorClinicsRepository;

  const mockDoctor = {
    id: 'doctor-1',
    name: 'Dr. Smith',
    email: 'smith@clinic.com',
    role: 'DOCTOR',
  };

  const mockClinic = {
    id: 'clinic-1',
    name: 'Test Clinic',
    address: '123 Main St',
    phone: '+11234567890',
    email: 'contact@clinic.com',
    tier: 'PROFESSIONAL',
    logo: null,
  };

  const mockAssignment = {
    id: 'assignment-1',
    doctorId: 'doctor-1',
    clinicId: 'clinic-1',
    role: 'doctor',
    active: true,
    createdAt: new Date(),
    doctor: mockDoctor,
    clinic: mockClinic,
  };

  const mockRepository: IDoctorClinicsRepository = {
    findAssignment: jest.fn<IDoctorClinicsRepository['findAssignment']>(),
    reactivateAssignment:
      jest.fn<IDoctorClinicsRepository['reactivateAssignment']>(),
    createAssignment: jest.fn<IDoctorClinicsRepository['createAssignment']>(),
    assignUserClinic: jest.fn<IDoctorClinicsRepository['assignUserClinic']>(),
    deactivateAssignment:
      jest.fn<IDoctorClinicsRepository['deactivateAssignment']>(),
    findDoctorClinics: jest.fn<IDoctorClinicsRepository['findDoctorClinics']>(),
    findClinicDoctors: jest.fn<IDoctorClinicsRepository['findClinicDoctors']>(),
    updateAssignmentRole:
      jest.fn<IDoctorClinicsRepository['updateAssignmentRole']>(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorClinicsService,
        {
          provide: DOCTOR_CLINICS_REPOSITORY_TOKEN,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DoctorClinicsService>(DoctorClinicsService);
    repository = module.get<IDoctorClinicsRepository>(
      DOCTOR_CLINICS_REPOSITORY_TOKEN,
    );

    jest.clearAllMocks();
  });

  it('injects the repository', () => {
    expect(service).toBeDefined();
    expect(repository).toBeDefined();
  });

  describe('assignDoctor', () => {
    it('creates new assignment when none exists', async () => {
      jest.mocked(mockRepository.findAssignment).mockResolvedValue(null);
      jest
        .mocked(mockRepository.createAssignment)
        .mockResolvedValue(mockAssignment);
      jest.mocked(mockRepository.assignUserClinic).mockResolvedValue();

      const result = await service.assignDoctor('doctor-1', 'clinic-1');

      expect(mockRepository.findAssignment).toHaveBeenCalledWith(
        'doctor-1',
        'clinic-1',
      );
      expect(mockRepository.createAssignment).toHaveBeenCalledWith(
        'doctor-1',
        'clinic-1',
        'doctor',
      );
      expect(mockRepository.assignUserClinic).toHaveBeenCalledWith(
        'doctor-1',
        'clinic-1',
      );
      expect(result).toEqual(mockAssignment);
    });

    it('reactivates existing assignment when found', async () => {
      const existingAssignment = { ...mockAssignment, active: false };
      jest
        .mocked(mockRepository.findAssignment)
        .mockResolvedValue(existingAssignment);
      jest.mocked(mockRepository.reactivateAssignment).mockResolvedValue({
        ...existingAssignment,
        active: true,
      });
      jest.mocked(mockRepository.assignUserClinic).mockResolvedValue();

      const result = await service.assignDoctor(
        'doctor-1',
        'clinic-1',
        'admin',
      );

      expect(mockRepository.reactivateAssignment).toHaveBeenCalledWith(
        'assignment-1',
        'admin',
      );
      expect(result.active).toBe(true);
    });

    it('handles user update errors gracefully when creating assignment', async () => {
      jest.mocked(mockRepository.findAssignment).mockResolvedValue(null);
      jest
        .mocked(mockRepository.createAssignment)
        .mockResolvedValue(mockAssignment);
      jest
        .mocked(mockRepository.assignUserClinic)
        .mockRejectedValue(new Error('User not found'));

      const result = await service.assignDoctor('doctor-1', 'clinic-1');

      expect(result).toEqual(mockAssignment);
    });
  });

  describe('removeDoctor', () => {
    it('deactivates existing assignment', async () => {
      jest
        .mocked(mockRepository.findAssignment)
        .mockResolvedValue(mockAssignment);
      jest.mocked(mockRepository.deactivateAssignment).mockResolvedValue({
        ...mockAssignment,
        active: false,
      });

      const result = await service.removeDoctor('doctor-1', 'clinic-1');

      expect(mockRepository.deactivateAssignment).toHaveBeenCalledWith(
        'assignment-1',
      );
      expect(result.active).toBe(false);
    });

    it('throws when assignment is missing', async () => {
      jest.mocked(mockRepository.findAssignment).mockResolvedValue(null);

      await expect(
        service.removeDoctor('doctor-1', 'clinic-1'),
      ).rejects.toThrow('Assignment not found');
    });
  });

  it('returns active clinics for doctor', async () => {
    const rows = [
      {
        id: 'assignment-1',
        role: 'doctor',
        active: true,
        createdAt: new Date(),
        clinic: mockClinic,
      },
    ];
    jest.mocked(mockRepository.findDoctorClinics).mockResolvedValue(rows);

    const result = await service.getDoctorClinics('doctor-1');

    expect(mockRepository.findDoctorClinics).toHaveBeenCalledWith('doctor-1');
    expect(result).toEqual(rows);
  });

  it('returns active doctors for clinic', async () => {
    jest
      .mocked(mockRepository.findClinicDoctors)
      .mockResolvedValue([mockAssignment]);

    const result = await service.getClinicDoctors('clinic-1');

    expect(mockRepository.findClinicDoctors).toHaveBeenCalledWith('clinic-1');
    expect(result).toEqual([mockAssignment]);
  });

  describe('updateRole', () => {
    it('updates role of existing assignment', async () => {
      jest
        .mocked(mockRepository.findAssignment)
        .mockResolvedValue(mockAssignment);
      jest.mocked(mockRepository.updateAssignmentRole).mockResolvedValue({
        ...mockAssignment,
        role: 'admin',
      });

      const result = await service.updateRole('doctor-1', 'clinic-1', 'admin');

      expect(mockRepository.updateAssignmentRole).toHaveBeenCalledWith(
        'assignment-1',
        'admin',
      );
      expect(result.role).toBe('admin');
    });

    it('throws when assignment is missing', async () => {
      jest.mocked(mockRepository.findAssignment).mockResolvedValue(null);

      await expect(
        service.updateRole('doctor-1', 'clinic-1', 'admin'),
      ).rejects.toThrow('Assignment not found');
    });
  });
});
