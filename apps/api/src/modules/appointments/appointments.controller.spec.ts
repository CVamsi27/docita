import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';

describe('AppointmentsController', () => {
  let controller: AppointmentsController;
  let service: AppointmentsService;

  const mockAppointmentsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createVitals: jest.fn(),
    updateVitals: jest.fn(),
  };

  const mockAppointment = {
    id: 'apt-123',
    clinicId: 'clinic-123',
    patientId: 'patient-123',
    doctorId: 'doctor-123',
    startTime: new Date(),
    endTime: new Date(),
    status: 'scheduled',
    type: 'consultation',
  };

  const mockAuthRequest = {
    user: {
      clinicId: 'clinic-123',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppointmentsController],
      providers: [
        {
          provide: AppointmentsService,
          useValue: mockAppointmentsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TierGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AppointmentsController>(AppointmentsController);
    service = module.get<AppointmentsService>(AppointmentsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return appointments for the clinic', async () => {
      mockAppointmentsService.findAll.mockResolvedValue([mockAppointment]);

      const result = await controller.findAll(mockAuthRequest as any);

      expect(result).toEqual([mockAppointment]);
      expect(mockAppointmentsService.findAll).toHaveBeenCalledWith(
        'clinic-123',
        {
          date: undefined,
          startDate: undefined,
          endDate: undefined,
        },
      );
    });

    it('should pass query parameters', async () => {
      mockAppointmentsService.findAll.mockResolvedValue([mockAppointment]);

      await controller.findAll(
        mockAuthRequest as any,
        '2025-11-28',
        undefined,
        undefined,
      );

      expect(mockAppointmentsService.findAll).toHaveBeenCalledWith(
        'clinic-123',
        {
          date: '2025-11-28',
          startDate: undefined,
          endDate: undefined,
        },
      );
    });
  });

  describe('findOne', () => {
    it('should return a single appointment', async () => {
      mockAppointmentsService.findOne.mockResolvedValue(mockAppointment);

      const result = await controller.findOne('apt-123');

      expect(result).toEqual(mockAppointment);
      expect(mockAppointmentsService.findOne).toHaveBeenCalledWith('apt-123');
    });
  });

  describe('create', () => {
    it('should create a new appointment', async () => {
      const createDto = {
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        startTime: new Date(),
        endTime: new Date(),
        status: 'scheduled' as const,
        type: 'consultation' as const,
      };

      mockAppointmentsService.create.mockResolvedValue(mockAppointment);

      const result = await controller.create(mockAuthRequest as any, createDto);

      expect(result).toEqual(mockAppointment);
      expect(mockAppointmentsService.create).toHaveBeenCalledWith({
        ...createDto,
        clinicId: 'clinic-123',
      });
    });
  });

  describe('update', () => {
    it('should update an appointment', async () => {
      const updateDto = { status: 'confirmed' as const };
      const updatedAppointment = { ...mockAppointment, ...updateDto };

      mockAppointmentsService.update.mockResolvedValue(updatedAppointment);

      const result = await controller.update(
        'apt-123',
        updateDto,
        mockAuthRequest as any,
      );

      expect(result).toEqual(updatedAppointment);
      expect(mockAppointmentsService.update).toHaveBeenCalledWith(
        'apt-123',
        updateDto,
        'clinic-123',
      );
    });
  });

  describe('remove', () => {
    it('should remove an appointment', async () => {
      mockAppointmentsService.remove.mockResolvedValue(mockAppointment);

      const result = await controller.remove('apt-123');

      expect(result).toEqual(mockAppointment);
      expect(mockAppointmentsService.remove).toHaveBeenCalledWith('apt-123');
    });
  });

  describe('createVitals', () => {
    it('should create vitals', async () => {
      const vitalsDto = {
        height: 175,
        weight: 70,
      };
      const mockVitals = { id: 'vitals-123', ...vitalsDto };

      mockAppointmentsService.createVitals.mockResolvedValue(mockVitals);

      const result = await controller.createVitals('apt-123', vitalsDto);

      expect(result).toEqual(mockVitals);
      expect(mockAppointmentsService.createVitals).toHaveBeenCalledWith(
        'apt-123',
        vitalsDto,
      );
    });
  });

  describe('updateVitals', () => {
    it('should update vitals', async () => {
      const vitalsDto = {
        weight: 71,
      };
      const mockVitals = { id: 'vitals-123', height: 175, ...vitalsDto };

      mockAppointmentsService.updateVitals.mockResolvedValue(mockVitals);

      const result = await controller.updateVitals('apt-123', vitalsDto);

      expect(result).toEqual(mockVitals);
      expect(mockAppointmentsService.updateVitals).toHaveBeenCalledWith(
        'apt-123',
        vitalsDto,
      );
    });
  });
});
