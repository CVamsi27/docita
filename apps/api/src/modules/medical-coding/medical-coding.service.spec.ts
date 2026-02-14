import { Test, TestingModule } from '@nestjs/testing';
import { MedicalCodingService } from './medical-coding.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AppointmentStatus } from '@workspace/db';

describe('MedicalCodingService', () => {
  let service: MedicalCodingService;
  let prisma: jest.Mocked<PrismaService>;

  const mockIcdCode = {
    id: 'icd-1',
    code: 'J45.0',
    description: 'Predominantly allergic asthma',
    isCommon: true,
  };

  const mockCptCode = {
    id: 'cpt-1',
    code: '99213',
    description: 'Office or other outpatient visit, established patient',
    isCommon: true,
  };

  const mockFavorite = {
    id: 'fav-1',
    userId: 'user-1',
    icdCodeId: 'icd-1',
    cptCodeId: null,
    createdAt: new Date(),
    icdCode: mockIcdCode,
    cptCode: null,
  };

  beforeEach(async () => {
    const prismaMock = {
      icdCode: {
        findMany: jest.fn(),
      },
      cptCode: {
        findMany: jest.fn(),
      },
      doctorFavoriteCode: {
        findMany: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      appointment: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicalCodingService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<MedicalCodingService>(MedicalCodingService);
    prisma = module.get(PrismaService);
  });

  describe('searchIcdCodes', () => {
    it('should return common codes when query is empty', async () => {
      const commonCodes = [mockIcdCode];
      prisma.icdCode.findMany.mockResolvedValue(commonCodes);

      const result = await service.searchIcdCodes('');

      expect(result).toEqual(commonCodes);
      expect(prisma.icdCode.findMany).toHaveBeenCalledWith({
        where: { isCommon: true },
        take: 20,
        orderBy: { code: 'asc' },
      });
    });

    it('should return common codes when query is too short (< 2 chars)', async () => {
      const commonCodes = [mockIcdCode];
      prisma.icdCode.findMany.mockResolvedValue(commonCodes);

      const result = await service.searchIcdCodes('J');

      expect(result).toEqual(commonCodes);
      expect(prisma.icdCode.findMany).toHaveBeenCalledWith({
        where: { isCommon: true },
        take: 20,
        orderBy: { code: 'asc' },
      });
    });

    it('should handle single code prefix search (e.g., C00)', async () => {
      const codes = [
        { ...mockIcdCode, code: 'C00.0' },
        { ...mockIcdCode, code: 'C00.1' },
      ];
      prisma.icdCode.findMany.mockResolvedValue(codes);

      const result = await service.searchIcdCodes('C00');

      expect(result).toEqual(codes);
      expect(prisma.icdCode.findMany).toHaveBeenCalledWith({
        where: {
          code: {
            startsWith: 'C00',
          },
        },
        take: 50,
        orderBy: [{ isCommon: 'desc' }, { code: 'asc' }],
      });
    });

    it('should handle range search (e.g., C00-D49)', async () => {
      const codes = [
        { ...mockIcdCode, code: 'C00.0' },
        { ...mockIcdCode, code: 'D00.0' },
      ];
      prisma.icdCode.findMany.mockResolvedValue(codes);

      const result = await service.searchIcdCodes('C00-D49');

      expect(result).toEqual(codes);
      expect(prisma.icdCode.findMany).toHaveBeenCalledWith({
        where: {
          code: {
            gte: 'C00',
            lte: 'D49',
          },
        },
        take: 50,
        orderBy: [{ isCommon: 'desc' }, { code: 'asc' }],
      });
    });

    it('should handle text search in code and description', async () => {
      prisma.icdCode.findMany.mockResolvedValue([mockIcdCode]);

      const result = await service.searchIcdCodes('asthma');

      expect(result).toEqual([mockIcdCode]);
      expect(prisma.icdCode.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { code: { contains: 'asthma', mode: 'insensitive' } },
            { description: { contains: 'asthma', mode: 'insensitive' } },
          ],
        },
        take: 20,
        orderBy: [{ isCommon: 'desc' }, { code: 'asc' }],
      });
    });

    it('should prioritize common codes in results', async () => {
      const codes = [
        { ...mockIcdCode, isCommon: true },
        { ...mockIcdCode, id: 'icd-2', isCommon: false },
      ];
      prisma.icdCode.findMany.mockResolvedValue(codes);

      const result = await service.searchIcdCodes('J45');

      expect(result).toEqual(codes);
      expect(prisma.icdCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ isCommon: 'desc' }, { code: 'asc' }],
        }),
      );
    });

    it('should handle case-insensitive range searches', async () => {
      prisma.icdCode.findMany.mockResolvedValue([mockIcdCode]);

      await service.searchIcdCodes('c00-d49');

      expect(prisma.icdCode.findMany).toHaveBeenCalledWith({
        where: {
          code: {
            gte: 'C00',
            lte: 'D49',
          },
        },
        take: 50,
        orderBy: [{ isCommon: 'desc' }, { code: 'asc' }],
      });
    });
  });

  describe('searchCptCodes', () => {
    it('should return common codes when query is empty', async () => {
      const commonCodes = [mockCptCode];
      prisma.cptCode.findMany.mockResolvedValue(commonCodes);

      const result = await service.searchCptCodes('');

      expect(result).toEqual(commonCodes);
      expect(prisma.cptCode.findMany).toHaveBeenCalledWith({
        where: { isCommon: true },
        take: 20,
        orderBy: { code: 'asc' },
      });
    });

    it('should return common codes when query is too short', async () => {
      const commonCodes = [mockCptCode];
      prisma.cptCode.findMany.mockResolvedValue(commonCodes);

      const result = await service.searchCptCodes('9');

      expect(result).toEqual(commonCodes);
      expect(prisma.cptCode.findMany).toHaveBeenCalledWith({
        where: { isCommon: true },
        take: 20,
        orderBy: { code: 'asc' },
      });
    });

    it('should handle single code prefix search with padding', async () => {
      const codes = [mockCptCode];
      prisma.cptCode.findMany.mockResolvedValue(codes);

      const result = await service.searchCptCodes('992');

      expect(result).toEqual(codes);
      // The service pads '992' to '00992' and then takes substring(0, 3) = '009'
      expect(prisma.cptCode.findMany).toHaveBeenCalledWith({
        where: {
          code: {
            startsWith: '009',
          },
        },
        take: 50,
        orderBy: [{ isCommon: 'desc' }, { code: 'asc' }],
      });
    });

    it('should handle range search (e.g., 00100-01999)', async () => {
      const codes = [mockCptCode];
      prisma.cptCode.findMany.mockResolvedValue(codes);

      const result = await service.searchCptCodes('00100-01999');

      expect(result).toEqual(codes);
      expect(prisma.cptCode.findMany).toHaveBeenCalledWith({
        where: {
          code: {
            gte: '00100',
            lte: '01999',
          },
        },
        take: 50,
        orderBy: [{ isCommon: 'desc' }, { code: 'asc' }],
      });
    });

    it('should handle text search in code and description', async () => {
      prisma.cptCode.findMany.mockResolvedValue([mockCptCode]);

      const result = await service.searchCptCodes('office visit');

      expect(result).toEqual([mockCptCode]);
      expect(prisma.cptCode.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { code: { contains: 'office visit', mode: 'insensitive' } },
            { description: { contains: 'office visit', mode: 'insensitive' } },
          ],
        },
        take: 20,
        orderBy: [{ isCommon: 'desc' }, { code: 'asc' }],
      });
    });

    it('should pad short numeric codes in range searches', async () => {
      prisma.cptCode.findMany.mockResolvedValue([mockCptCode]);

      await service.searchCptCodes('1-999');

      expect(prisma.cptCode.findMany).toHaveBeenCalledWith({
        where: {
          code: {
            gte: '00001',
            lte: '00999',
          },
        },
        take: 50,
        orderBy: [{ isCommon: 'desc' }, { code: 'asc' }],
      });
    });
  });

  describe('ICD Code Favorites', () => {
    describe('getFavorites', () => {
      it('should retrieve user ICD code favorites', async () => {
        prisma.doctorFavoriteCode.findMany.mockResolvedValue([mockFavorite]);

        const result = await service.getFavorites('user-1');

        expect(result).toEqual([mockFavorite]);
        expect(prisma.doctorFavoriteCode.findMany).toHaveBeenCalledWith({
          where: {
            userId: 'user-1',
            icdCodeId: { not: null },
          },
          include: {
            icdCode: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });
      });

      it('should return empty array when user has no favorites', async () => {
        prisma.doctorFavoriteCode.findMany.mockResolvedValue([]);

        const result = await service.getFavorites('user-empty');

        expect(result).toEqual([]);
      });
    });

    describe('addFavorite', () => {
      it('should add ICD code to favorites', async () => {
        prisma.doctorFavoriteCode.create.mockResolvedValue(mockFavorite);

        const result = await service.addFavorite('user-1', 'icd-1');

        expect(result).toEqual(mockFavorite);
        expect(prisma.doctorFavoriteCode.create).toHaveBeenCalledWith({
          data: {
            userId: 'user-1',
            icdCodeId: 'icd-1',
          },
          include: {
            icdCode: true,
          },
        });
      });
    });

    describe('removeFavorite', () => {
      it('should remove ICD code from favorites', async () => {
        prisma.doctorFavoriteCode.deleteMany.mockResolvedValue({ count: 1 });

        const result = await service.removeFavorite('user-1', 'icd-1');

        expect(result).toEqual({ count: 1 });
        expect(prisma.doctorFavoriteCode.deleteMany).toHaveBeenCalledWith({
          where: {
            userId: 'user-1',
            icdCodeId: 'icd-1',
          },
        });
      });

      it('should return 0 count if favorite does not exist', async () => {
        prisma.doctorFavoriteCode.deleteMany.mockResolvedValue({ count: 0 });

        const result = await service.removeFavorite('user-1', 'invalid-id');

        expect(result.count).toBe(0);
      });
    });
  });

  describe('CPT Code Favorites', () => {
    describe('getCptFavorites', () => {
      it('should retrieve user CPT code favorites', async () => {
        const cptFavorite = {
          ...mockFavorite,
          icdCodeId: null,
          cptCodeId: 'cpt-1',
          icdCode: null,
          cptCode: mockCptCode,
        };
        prisma.doctorFavoriteCode.findMany.mockResolvedValue([cptFavorite]);

        const result = await service.getCptFavorites('user-1');

        expect(result).toEqual([cptFavorite]);
        expect(prisma.doctorFavoriteCode.findMany).toHaveBeenCalledWith({
          where: {
            userId: 'user-1',
            cptCodeId: { not: null },
          },
          include: {
            cptCode: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });
      });
    });

    describe('addCptFavorite', () => {
      it('should add CPT code to favorites', async () => {
        const cptFavorite = {
          ...mockFavorite,
          icdCodeId: null,
          cptCodeId: 'cpt-1',
          icdCode: null,
          cptCode: mockCptCode,
        };
        prisma.doctorFavoriteCode.create.mockResolvedValue(cptFavorite);

        const result = await service.addCptFavorite('user-1', 'cpt-1');

        expect(result).toEqual(cptFavorite);
        expect(prisma.doctorFavoriteCode.create).toHaveBeenCalledWith({
          data: {
            userId: 'user-1',
            cptCodeId: 'cpt-1',
          },
          include: {
            cptCode: true,
          },
        });
      });
    });

    describe('removeCptFavorite', () => {
      it('should remove CPT code from favorites', async () => {
        prisma.doctorFavoriteCode.deleteMany.mockResolvedValue({ count: 1 });

        const result = await service.removeCptFavorite('user-1', 'cpt-1');

        expect(result).toEqual({ count: 1 });
        expect(prisma.doctorFavoriteCode.deleteMany).toHaveBeenCalledWith({
          where: {
            userId: 'user-1',
            cptCodeId: 'cpt-1',
          },
        });
      });
    });
  });

  describe('getUncodedVisits', () => {
    it('should return empty array when clinicId is missing', async () => {
      const result = await service.getUncodedVisits('');

      expect(result).toEqual([]);
      expect(prisma.appointment.findMany).not.toHaveBeenCalled();
    });

    it('should retrieve completed appointments without diagnoses', async () => {
      const uncodedVisits = [
        {
          id: 'appt-1',
          clinicId: 'clinic-1',
          status: AppointmentStatus.COMPLETED,
          patient: { id: 'patient-1', firstName: 'John', lastName: 'Doe' },
          doctor: { id: 'doctor-1', name: 'Dr. Smith' },
          createdAt: new Date(),
        },
      ];
      prisma.appointment.findMany.mockResolvedValue(uncodedVisits);

      const result = await service.getUncodedVisits('clinic-1');

      expect(result).toEqual(uncodedVisits);
      expect(prisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          clinicId: 'clinic-1',
          status: AppointmentStatus.COMPLETED,
          diagnoses: {
            none: {},
          },
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          doctor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      });
    });

    it('should filter by patient search term', async () => {
      const uncodedVisits = [
        {
          id: 'appt-1',
          patient: { id: 'patient-1', firstName: 'John', lastName: 'Doe' },
          doctor: { id: 'doctor-1', name: 'Dr. Smith' },
        },
      ];
      prisma.appointment.findMany.mockResolvedValue(uncodedVisits);

      const result = await service.getUncodedVisits('clinic-1', 'John');

      expect(result).toEqual(uncodedVisits);
      expect(prisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          clinicId: 'clinic-1',
          status: AppointmentStatus.COMPLETED,
          diagnoses: {
            none: {},
          },
          patient: {
            OR: [
              { firstName: { contains: 'John', mode: 'insensitive' } },
              { lastName: { contains: 'John', mode: 'insensitive' } },
              { phoneNumber: { contains: 'John' } },
            ],
          },
        },
        include: expect.any(Object),
        orderBy: expect.any(Object),
        take: 50,
      });
    });

    it('should limit results to 50 visits', async () => {
      prisma.appointment.findMany.mockResolvedValue([]);

      await service.getUncodedVisits('clinic-1');

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        }),
      );
    });

    it('should only include completed appointments', async () => {
      prisma.appointment.findMany.mockResolvedValue([]);

      await service.getUncodedVisits('clinic-1');

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: AppointmentStatus.COMPLETED,
          }),
        }),
      );
    });

    it('should only include appointments without diagnoses', async () => {
      prisma.appointment.findMany.mockResolvedValue([]);

      await service.getUncodedVisits('clinic-1');

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            diagnoses: { none: {} },
          }),
        }),
      );
    });
  });

  describe('Dependency Injection', () => {
    it('should be injectable', () => {
      expect(service).toBeDefined();
    });

    it('should have PrismaService injected', () => {
      expect(prisma).toBeDefined();
    });

    it('should have all required methods', () => {
      expect(typeof service.searchIcdCodes).toBe('function');
      expect(typeof service.searchCptCodes).toBe('function');
      expect(typeof service.getFavorites).toBe('function');
      expect(typeof service.addFavorite).toBe('function');
      expect(typeof service.removeFavorite).toBe('function');
      expect(typeof service.getCptFavorites).toBe('function');
      expect(typeof service.addCptFavorite).toBe('function');
      expect(typeof service.removeCptFavorite).toBe('function');
      expect(typeof service.getUncodedVisits).toBe('function');
    });
  });
});
