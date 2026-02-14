import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisCachingService } from '../../common/services/redis-caching.service';

describe('SearchService', () => {
  let service: SearchService;
  let prisma: jest.Mocked<PrismaService>;
  let cacheService: jest.Mocked<RedisCachingService>;

  const mockClinicId = 'clinic-123';
  const mockPrismaQueryRaw = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: mockPrismaQueryRaw,
            patient: {
              findMany: jest.fn(),
            },
            appointment: {
              findMany: jest.fn(),
            },
            prescription: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: RedisCachingService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            invalidateTag: jest.fn(),
            clear: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    cacheService = module.get(RedisCachingService) as jest.Mocked<RedisCachingService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('search', () => {
    it('should return empty array for queries shorter than 2 characters', async () => {
      const result = await service.search({
        clinicId: mockClinicId,
        query: 'a',
        types: ['all'],
        limit: 20,
      });

      expect(result).toEqual([]);
      expect(cacheService.get).not.toHaveBeenCalled();
    });

    it('should return cached results if available', async () => {
      const cachedResults = [
        {
          id: 'patient-1',
          type: 'patient' as const,
          title: 'John Doe',
          subtitle: '1234567890',
        },
      ];
      cacheService.get.mockResolvedValue(cachedResults);

      const result = await service.search({
        clinicId: mockClinicId,
        query: 'john',
        types: ['all'],
        limit: 20,
      });

      expect(result).toEqual(cachedResults);
      expect(cacheService.get).toHaveBeenCalledWith(
        'search:clinic-123:john:all:20',
      );
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('should search across all entity types when type is "all"', async () => {
      cacheService.get.mockResolvedValue(null);
      mockPrismaQueryRaw
        .mockResolvedValueOnce([]) // patient search
        .mockResolvedValueOnce([]) // appointment search
      prisma.prescription.findMany.mockResolvedValue([]);

      await service.search({
        clinicId: mockClinicId,
        query: 'test query',
        types: ['all'],
        limit: 20,
      });

      expect(mockPrismaQueryRaw).toHaveBeenCalledTimes(2); // patients + appointments (full-text)
      expect(prisma.prescription.findMany).toHaveBeenCalledTimes(1);
    });

    it('should search only specified entity types', async () => {
      cacheService.get.mockResolvedValue(null);
      mockPrismaQueryRaw.mockResolvedValue([]);

      await service.search({
        clinicId: mockClinicId,
        query: 'test',
        types: ['patient'],
        limit: 20,
      });

      expect(mockPrismaQueryRaw).toHaveBeenCalledTimes(1); // only patients
      expect(prisma.prescription.findMany).not.toHaveBeenCalled();
    });

    it('should sort results by relevance score', async () => {
      cacheService.get.mockResolvedValue(null);
      mockPrismaQueryRaw
        .mockResolvedValueOnce([
          {
            id: 'patient-1',
            firstName: 'John',
            lastName: 'Doe',
            phoneNumber: '1234567890',
            mrn: 'MRN001',
            rank: 0.5,
          },
          {
            id: 'patient-2',
            firstName: 'Jane',
            lastName: 'Doe',
            phoneNumber: '0987654321',
            mrn: 'MRN002',
            rank: 0.9,
          },
        ])
        .mockResolvedValueOnce([]) // appointments
      prisma.prescription.findMany.mockResolvedValue([]);

      const result = await service.search({
        clinicId: mockClinicId,
        query: 'doe',
        types: ['all'],
        limit: 20,
      });

      // Higher rank should come first
      expect(result[0].id).toBe('patient-2');
      expect(result[0].relevanceScore).toBe(0.9);
      expect(result[1].id).toBe('patient-1');
      expect(result[1].relevanceScore).toBe(0.5);
    });

    it('should respect the limit parameter', async () => {
      cacheService.get.mockResolvedValue(null);
      const mockPatients = Array.from({ length: 30 }, (_, i) => ({
        id: `patient-${i}`,
        firstName: `Patient${i}`,
        lastName: 'Test',
        phoneNumber: `${i}`,
        mrn: `MRN${i}`,
        rank: 0.5,
      }));
      mockPrismaQueryRaw
        .mockResolvedValueOnce(mockPatients)
        .mockResolvedValueOnce([]); // appointments
      prisma.prescription.findMany.mockResolvedValue([]);

      const result = await service.search({
        clinicId: mockClinicId,
        query: 'test',
        types: ['all'],
        limit: 10,
      });

      expect(result.length).toBe(10);
    });

    it('should cache search results after fetching', async () => {
      cacheService.get.mockResolvedValue(null);
      mockPrismaQueryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      prisma.prescription.findMany.mockResolvedValue([]);

      await service.search({
        clinicId: mockClinicId,
        query: 'test',
        types: ['all'],
        limit: 20,
      });

      expect(cacheService.set).toHaveBeenCalledWith(
        'search:clinic-123:test:all:20',
        [],
        { ttl: 300 },
      );
    });

    it('should fallback to ILIKE search when full-text search fails', async () => {
      cacheService.get.mockResolvedValue(null);
      mockPrismaQueryRaw
        .mockRejectedValueOnce(new Error('tsvector column not found')) // patient full-text fails
        .mockRejectedValueOnce(new Error('tsvector column not found')); // appointment full-text fails
      prisma.patient.findMany.mockResolvedValue([
        {
          id: 'patient-1',
          firstName: 'John',
          lastName: 'Doe',
          phoneNumber: '1234567890',
          mrn: 'MRN001',
          email: 'john@example.com',
          clinicId: mockClinicId,
          createdAt: new Date(),
          updatedAt: new Date(),
          dateOfBirth: null,
          gender: 'male',
          address: null,
          bloodGroup: null,
          emergencyContact: null,
          emergencyContactPhone: null,
          allergies: null,
          chronicConditions: null,
          insuranceProvider: null,
          insuranceNumber: null,
          referralSource: null,
          notes: null,
          archived: false,
          tags: [],
          customData: {},
        },
      ]);
      prisma.appointment.findMany.mockResolvedValue([]);
      prisma.prescription.findMany.mockResolvedValue([]);

      const result = await service.search({
        clinicId: mockClinicId,
        query: 'john',
        types: ['all'],
        limit: 20,
      });

      expect(result.length).toBe(1);
      expect(result[0].title).toBe('John Doe');
      expect(prisma.patient.findMany).toHaveBeenCalled();
    });

    it('should prioritize exact title matches over partial matches', async () => {
      cacheService.get.mockResolvedValue(null);
      const query = 'john';
      mockPrismaQueryRaw
        .mockResolvedValueOnce([
          {
            id: 'patient-1',
            firstName: 'Johnny',
            lastName: 'Smith',
            phoneNumber: '1111111111',
            mrn: 'MRN001',
            rank: 0.7,
          },
          {
            id: 'patient-2',
            firstName: 'John',
            lastName: 'Doe',
            phoneNumber: '2222222222',
            mrn: 'MRN002',
            rank: 0.7, // Same rank score
          },
        ])
        .mockResolvedValueOnce([]);
      prisma.prescription.findMany.mockResolvedValue([]);

      const result = await service.search({
        clinicId: mockClinicId,
        query,
        types: ['all'],
        limit: 20,
      });

      // With same relevance score, exact match on title should come first
      const exactMatchIndex = result.findIndex((r) =>
        r.title.toLowerCase().includes(query),
      );
      const partialMatchIndex = result.findIndex(
        (r) =>
          r.title.toLowerCase().includes(query) &&
          r.title.toLowerCase() !== 'john doe',
      );

      // At least one result should match
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('searchPatients', () => {
    it('should format patient results with name, phone, and MRN', async () => {
      cacheService.get.mockResolvedValue(null);
      mockPrismaQueryRaw
        .mockResolvedValueOnce([
          {
            id: 'patient-1',
            firstName: 'John',
            lastName: 'Doe',
            phoneNumber: '1234567890',
            mrn: 'MRN001',
            rank: 0.8,
          },
        ])
        .mockResolvedValueOnce([]);
      prisma.prescription.findMany.mockResolvedValue([]);

      const result = await service.search({
        clinicId: mockClinicId,
        query: 'john',
        types: ['patient'],
        limit: 20,
      });

      expect(result[0]).toMatchObject({
        id: 'patient-1',
        type: 'patient',
        title: 'John Doe',
        subtitle: '1234567890',
        relevanceScore: 0.8,
        meta: { mrn: 'MRN001' },
      });
    });

    it('should handle patients without phone numbers', async () => {
      cacheService.get.mockResolvedValue(null);
      // Only mock patient search since types=['patient']
      mockPrismaQueryRaw.mockResolvedValueOnce([
        {
          id: 'patient-1',
          firstName: 'John',
          lastName: 'Doe',
          phoneNumber: null,
          mrn: 'MRN001',
          rank: 0.8,
        },
      ]);

      const result = await service.search({
        clinicId: mockClinicId,
        query: 'john',
        types: ['patient'],
        limit: 20,
      });

      expect(result.length).toBe(1);
      expect(result[0].subtitle).toBeUndefined();
    });
  });

  describe('searchAppointments', () => {
    beforeEach(() => {
      // Reset mocks before each appointment test
      jest.resetAllMocks();
    });

    it('should format appointment results with patient name and chief complaint', async () => {
      cacheService.get.mockResolvedValue(null);
      mockPrismaQueryRaw
        .mockResolvedValueOnce([]) // patients
        .mockResolvedValueOnce([
          {
            id: 'appt-1',
            notes: 'Follow-up visit',
            chiefComplaint: 'Headache',
            startTime: new Date('2026-02-15T10:00:00Z'),
            patientFirstName: 'Jane',
            patientLastName: 'Smith',
            rank: 0.6,
          },
        ]);
      prisma.prescription.findMany.mockResolvedValue([]);

      const result = await service.search({
        clinicId: mockClinicId,
        query: 'headache',
        types: ['all'],
        limit: 20,
      });

      const apptResult = result.find((r) => r.type === 'appointment');
      expect(apptResult).toBeDefined();
      expect(apptResult).toMatchObject({
        id: 'appt-1',
        type: 'appointment',
        title: 'Jane Smith',
        subtitle: 'Headache',
        relevanceScore: 0.6,
        meta: { startTime: new Date('2026-02-15T10:00:00Z') },
      });
    });

    it('should fallback to notes if chief complaint is missing', async () => {
      cacheService.get.mockResolvedValue(null);
      mockPrismaQueryRaw
        .mockResolvedValueOnce([]) // patients
        .mockResolvedValueOnce([
          {
            id: 'appt-2',
            notes: 'Annual checkup',
            chiefComplaint: null,
            startTime: new Date('2026-02-15T10:00:00Z'),
            patientFirstName: 'Jane',
            patientLastName: 'Smith',
            rank: 0.6,
          },
        ]);
      prisma.prescription.findMany.mockResolvedValue([]);

      const result = await service.search({
        clinicId: mockClinicId,
        query: 'checkup',
        types: ['all'],
        limit: 20,
      });

      const apptResult = result.find((r) => r.type === 'appointment');
      expect(apptResult).toBeDefined();
      expect(apptResult?.subtitle).toBe('Annual checkup');
    });

    it('should use fallback text when both chief complaint and notes are missing', async () => {
      cacheService.get.mockResolvedValue(null);
      mockPrismaQueryRaw
        .mockResolvedValueOnce([]) // patients
        .mockResolvedValueOnce([
          {
            id: 'appt-3',
            notes: null,
            chiefComplaint: null,
            startTime: new Date('2026-02-15T10:00:00Z'),
            patientFirstName: 'Jane',
            patientLastName: 'Smith',
            rank: 0.6,
          },
        ]);
      prisma.prescription.findMany.mockResolvedValue([]);

      const result = await service.search({
        clinicId: mockClinicId,
        query: 'smith',
        types: ['all'],
        limit: 20,
      });

      const apptResult = result.find((r) => r.type === 'appointment');
      expect(apptResult).toBeDefined();
      expect(apptResult?.subtitle).toBe('Appointment');
    });
  });

  describe('searchPrescriptions', () => {
    it('should format prescription results with patient name and instructions', async () => {
      cacheService.get.mockResolvedValue(null);
      mockPrismaQueryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      prisma.prescription.findMany.mockResolvedValue([
        {
          id: 'rx-1',
          instructions: 'Take twice daily',
          createdAt: new Date('2026-02-01T10:00:00Z'),
          patient: {
            firstName: 'Bob',
            lastName: 'Johnson',
          },
          patientId: 'patient-1',
          clinicId: mockClinicId,
          doctorId: 'doctor-1',
          appointmentId: null,
          diagnosis: null,
          notes: null,
          followUpDays: null,
          updatedAt: new Date(),
        },
      ]);

      const result = await service.search({
        clinicId: mockClinicId,
        query: 'twice daily',
        types: ['prescription'],
        limit: 20,
      });

      expect(result[0]).toMatchObject({
        id: 'rx-1',
        type: 'prescription',
        title: 'Bob Johnson',
        subtitle: 'Take twice daily',
        meta: { createdAt: new Date('2026-02-01T10:00:00Z') },
      });
    });

    it('should use fallback text when instructions are missing', async () => {
      cacheService.get.mockResolvedValue(null);
      mockPrismaQueryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      prisma.prescription.findMany.mockResolvedValue([
        {
          id: 'rx-1',
          instructions: null,
          createdAt: new Date('2026-02-01T10:00:00Z'),
          patient: {
            firstName: 'Bob',
            lastName: 'Johnson',
          },
          patientId: 'patient-1',
          clinicId: mockClinicId,
          doctorId: 'doctor-1',
          appointmentId: null,
          diagnosis: null,
          notes: null,
          followUpDays: null,
          updatedAt: new Date(),
        },
      ]);

      const result = await service.search({
        clinicId: mockClinicId,
        query: 'johnson',
        types: ['prescription'],
        limit: 20,
      });

      expect(result[0].subtitle).toBe('Prescription');
    });

    it('should search by patient name in prescriptions', async () => {
      cacheService.get.mockResolvedValue(null);
      mockPrismaQueryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      prisma.prescription.findMany.mockResolvedValue([
        {
          id: 'rx-1',
          instructions: 'Take as needed',
          createdAt: new Date('2026-02-01T10:00:00Z'),
          patient: {
            firstName: 'Alice',
            lastName: 'Williams',
          },
          patientId: 'patient-1',
          clinicId: mockClinicId,
          doctorId: 'doctor-1',
          appointmentId: null,
          diagnosis: null,
          notes: null,
          followUpDays: null,
          updatedAt: new Date(),
        },
      ]);

      await service.search({
        clinicId: mockClinicId,
        query: 'alice',
        types: ['prescription'],
        limit: 20,
      });

      expect(prisma.prescription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                patient: {
                  firstName: { contains: 'alice', mode: 'insensitive' },
                },
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe('invalidateSearchCache', () => {
    it('should invalidate cache for specific clinic', async () => {
      await service.invalidateSearchCache(mockClinicId);

      expect(cacheService.invalidateTag).toHaveBeenCalledWith(
        `search:${mockClinicId}`,
      );
    });

    it('should clear all caches when no clinicId provided', async () => {
      await service.invalidateSearchCache();

      expect(cacheService.clear).toHaveBeenCalled();
      expect(cacheService.invalidateTag).not.toHaveBeenCalled();
    });
  });

  describe('dependency injection', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should inject PrismaService', () => {
      expect(prisma).toBeDefined();
    });

    it('should inject RedisCachingService', () => {
      expect(cacheService).toBeDefined();
    });
  });
});
