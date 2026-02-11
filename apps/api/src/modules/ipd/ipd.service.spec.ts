import { Test, TestingModule } from '@nestjs/testing';
import { IpdService } from './ipd.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { IpdFactory } from './factories/ipd.factory';

describe('IpdService', () => {
  let service: IpdService;
  let prisma: PrismaService;
  let ipdFactory: IpdFactory;

  const mockWard = {
    id: 'ward-123',
    name: 'General Ward',
    clinicId: 'clinic-123',
    floor: 1,
    rooms: [],
  };

  const mockBed = {
    id: 'bed-123',
    bedNumber: '101',
    status: 'AVAILABLE',
    roomId: 'room-123',
  };

  const mockAdmission = {
    id: 'admission-123',
    patientId: 'patient-123',
    bedId: 'bed-123',
    admittingDoctorId: 'doctor-123',
    status: 'ADMITTED',
    admittedAt: new Date(),
  };

  const mockTransaction = {
    bed: {
      update: jest.fn(),
    },
    admission: {
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockPrismaService = {
    ward: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    room: {
      create: jest.fn(),
    },
    bed: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    admission: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockIpdFactory = {
    createAdmission: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IpdService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: IpdFactory,
          useValue: mockIpdFactory,
        },
      ],
    }).compile();

    service = module.get<IpdService>(IpdService);
    prisma = module.get<PrismaService>(PrismaService);
    ipdFactory = module.get<IpdFactory>(IpdFactory);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllWards', () => {
    it('should return all wards for a clinic with rooms and beds', async () => {
      mockPrismaService.ward.findMany.mockResolvedValue([mockWard]);

      const result = await service.findAllWards('clinic-123');

      expect(result).toEqual([mockWard]);
      expect(mockPrismaService.ward.findMany).toHaveBeenCalledWith({
        where: { clinicId: 'clinic-123' },
        include: {
          rooms: {
            include: {
              beds: {
                include: {
                  admissions: {
                    include: {
                      patient: {
                        select: {
                          firstName: true,
                          id: true,
                          lastName: true,
                        },
                      },
                    },
                    where: {
                      status: 'ADMITTED',
                    },
                  },
                },
              },
            },
          },
        },
      });
    });
  });

  describe('createWard', () => {
    it('should create a new ward', async () => {
      const wardData = {
        name: 'ICU',
        clinicId: 'clinic-123',
        floor: '2',
        capacity: 20,
      };
      mockPrismaService.ward.create.mockResolvedValue({
        id: 'new-ward',
        ...wardData,
      });

      const result = await service.createWard(wardData);

      expect(result.name).toBe('ICU');
      expect(mockPrismaService.ward.create).toHaveBeenCalledWith({
        data: wardData,
      });
    });
  });

  describe('createRoom', () => {
    it('should create a new room', async () => {
      const roomData = { roomNumber: '101', wardId: 'ward-123' };
      mockPrismaService.room.create.mockResolvedValue({
        id: 'new-room',
        ...roomData,
      });

      const result = await service.createRoom(roomData);

      expect(result.roomNumber).toBe('101');
    });
  });

  describe('createBed', () => {
    it('should create a new bed', async () => {
      const bedData = { bedNumber: '101A', roomId: 'room-123' };
      mockPrismaService.bed.create.mockResolvedValue({
        id: 'new-bed',
        ...bedData,
        status: 'AVAILABLE',
      });

      const result = await service.createBed(bedData);

      expect(result.bedNumber).toBe('101A');
    });
  });

  describe('updateBedStatus', () => {
    it('should update bed status', async () => {
      mockPrismaService.bed.update.mockResolvedValue({
        ...mockBed,
        status: 'OCCUPIED',
      });

      const result = await service.updateBedStatus(
        'bed-123',
        'OCCUPIED' as any,
      );

      expect(result.status).toBe('OCCUPIED');
      expect(mockPrismaService.bed.update).toHaveBeenCalledWith({
        where: { id: 'bed-123' },
        data: { status: 'OCCUPIED' },
      });
    });
  });

  describe('admitPatient', () => {
    it('should admit a patient and update bed status', async () => {
      mockPrismaService.bed.findUnique.mockResolvedValue({
        ...mockBed,
        status: 'AVAILABLE',
      });
      mockPrismaService.$transaction.mockImplementation((callback) => {
        mockTransaction.bed.update.mockResolvedValue({
          ...mockBed,
          status: 'OCCUPIED',
        });
        mockTransaction.admission.create.mockResolvedValue(mockAdmission);
        return callback(mockTransaction);
      });

      const admitData = {
        patientId: 'patient-123',
        bedId: 'bed-123',
        admittingDoctorId: 'doctor-123',
      };

      const mockValidatedData = {
        ...admitData,
        status: 'ADMITTED',
        admittedAt: expect.any(Date),
      };
      mockIpdFactory.createAdmission.mockReturnValue(mockValidatedData);

      const result = await service.admitPatient(admitData);

      expect(result.patientId).toBe('patient-123');
      expect(mockIpdFactory.createAdmission).toHaveBeenCalledWith(admitData);
      expect(mockPrismaService.bed.findUnique).toHaveBeenCalledWith({
        where: { id: 'bed-123' },
      });
    });

    it('should throw error if bed is not available', async () => {
      mockPrismaService.bed.findUnique.mockResolvedValue({
        ...mockBed,
        status: 'OCCUPIED',
      });

      const admitData = {
        patientId: 'p1',
        bedId: 'bed-123',
        admittingDoctorId: 'd1',
      };
      mockIpdFactory.createAdmission.mockReturnValue(admitData);

      await expect(service.admitPatient(admitData)).rejects.toThrow(
        'Bed is not available',
      );
    });

    it('should throw error if bed does not exist', async () => {
      mockPrismaService.bed.findUnique.mockResolvedValue(null);

      const admitData = {
        patientId: 'p1',
        bedId: 'invalid',
        admittingDoctorId: 'd1',
      };
      mockIpdFactory.createAdmission.mockReturnValue(admitData);

      await expect(service.admitPatient(admitData)).rejects.toThrow(
        'Bed is not available',
      );
    });
  });

  describe('dischargePatient', () => {
    it('should discharge a patient and free the bed', async () => {
      mockPrismaService.admission.findUnique.mockResolvedValue(mockAdmission);
      mockPrismaService.$transaction.mockImplementation((callback) => {
        mockTransaction.bed.update.mockResolvedValue({
          ...mockBed,
          status: 'AVAILABLE',
        });
        mockTransaction.admission.update.mockResolvedValue({
          ...mockAdmission,
          status: 'DISCHARGED',
          dischargedAt: new Date(),
        });
        return callback(mockTransaction);
      });

      const result = await service.dischargePatient('admission-123');

      expect(result.status).toBe('DISCHARGED');
    });

    it('should throw NotFoundException if admission not found', async () => {
      mockPrismaService.admission.findUnique.mockResolvedValue(null);

      await expect(service.dischargePatient('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
