import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackService } from './feedback.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    feedback: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  const mockFeedback = {
    id: 'feedback-1',
    clinicId: 'clinic-1',
    userId: 'user-1',
    overallRating: 4,
    goodFeatures: ['Easy to use', 'Fast'],
    goodFeaturesReason: 'Very intuitive interface',
    badFeatures: ['Limited reports'],
    badFeaturesReason: 'Need more analytics',
    improvementAreas: ['Reporting', 'Mobile app'],
    improvementReason: 'Would help with on-the-go access',
    featureRequests: 'Add telehealth integration',
    generalComments: 'Great product overall',
    category: 'GENERAL',
    status: 'NEW',
    adminNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('Dependency Injection', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should inject PrismaService', () => {
      expect(prismaService).toBeDefined();
    });
  });

  describe('create', () => {
    const createData = {
      overallRating: 4,
      goodFeatures: ['Easy to use'],
      goodFeaturesReason: 'Intuitive',
      badFeatures: [],
      badFeaturesReason: undefined,
      improvementAreas: ['Reports'],
      improvementReason: 'More analytics',
      featureRequests: 'Telehealth',
      generalComments: 'Good product',
      category: 'GENERAL',
    };

    it('should create feedback successfully', async () => {
      const feedbackWithRelations = {
        ...mockFeedback,
        user: { id: 'user-1', name: 'John Doe', email: 'john@example.com' },
        clinic: { id: 'clinic-1', name: 'Test Clinic' },
      };

      mockPrismaService.feedback.create.mockResolvedValue(
        feedbackWithRelations,
      );

      const result = await service.create('clinic-1', 'user-1', createData);

      expect(result).toEqual(feedbackWithRelations);
      expect(mockPrismaService.feedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clinicId: 'clinic-1',
          userId: 'user-1',
          overallRating: 4,
          status: 'NEW',
        }),
        include: expect.any(Object),
      });
    });

    it('should set empty arrays for undefined array fields', async () => {
      mockPrismaService.feedback.create.mockResolvedValue(mockFeedback);

      await service.create('clinic-1', 'user-1', {
        overallRating: 5,
      });

      expect(mockPrismaService.feedback.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            goodFeatures: [],
            badFeatures: [],
            improvementAreas: [],
          }),
        }),
      );
    });

    it('should default category to GENERAL if not provided', async () => {
      mockPrismaService.feedback.create.mockResolvedValue(mockFeedback);

      await service.create('clinic-1', 'user-1', {
        overallRating: 3,
      });

      expect(mockPrismaService.feedback.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            category: 'GENERAL',
          }),
        }),
      );
    });
  });

  describe('findAllForClinic', () => {
    it('should return all feedback for a clinic', async () => {
      const feedbacks = [mockFeedback];
      mockPrismaService.feedback.findMany.mockResolvedValue(feedbacks);

      const result = await service.findAllForClinic('clinic-1');

      expect(result).toEqual(feedbacks);
      expect(mockPrismaService.feedback.findMany).toHaveBeenCalledWith({
        where: { clinicId: 'clinic-1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no feedback exists', async () => {
      mockPrismaService.feedback.findMany.mockResolvedValue([]);

      const result = await service.findAllForClinic('clinic-1');

      expect(result).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('should return all feedback without filters', async () => {
      const feedbacks = [mockFeedback];
      mockPrismaService.feedback.findMany.mockResolvedValue(feedbacks);

      const result = await service.findAll();

      expect(result).toEqual(feedbacks);
      expect(mockPrismaService.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrismaService.feedback.findMany.mockResolvedValue([mockFeedback]);

      await service.findAll({ status: 'REVIEWED' });

      expect(mockPrismaService.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'REVIEWED' },
        }),
      );
    });

    it('should filter by category', async () => {
      mockPrismaService.feedback.findMany.mockResolvedValue([mockFeedback]);

      await service.findAll({ category: 'BUG_REPORT' });

      expect(mockPrismaService.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { category: 'BUG_REPORT' },
        }),
      );
    });

    it('should filter by clinicId', async () => {
      mockPrismaService.feedback.findMany.mockResolvedValue([mockFeedback]);

      await service.findAll({ clinicId: 'clinic-1' });

      expect(mockPrismaService.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clinicId: 'clinic-1' },
        }),
      );
    });

    it('should filter by minimum rating', async () => {
      mockPrismaService.feedback.findMany.mockResolvedValue([mockFeedback]);

      await service.findAll({ minRating: 4 });

      expect(mockPrismaService.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { overallRating: { gte: 4 } },
        }),
      );
    });

    it('should filter by maximum rating', async () => {
      mockPrismaService.feedback.findMany.mockResolvedValue([mockFeedback]);

      await service.findAll({ maxRating: 3 });

      expect(mockPrismaService.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { overallRating: { lte: 3 } },
        }),
      );
    });

    it('should filter by rating range', async () => {
      mockPrismaService.feedback.findMany.mockResolvedValue([mockFeedback]);

      await service.findAll({ minRating: 3, maxRating: 5 });

      expect(mockPrismaService.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { overallRating: { gte: 3, lte: 5 } },
        }),
      );
    });

    it('should filter by search text', async () => {
      mockPrismaService.feedback.findMany.mockResolvedValue([mockFeedback]);

      await service.findAll({ search: 'telehealth' });

      expect(mockPrismaService.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                featureRequests: expect.objectContaining({
                  contains: 'telehealth',
                }),
              }),
            ]),
          }),
        }),
      );
    });

    it('should combine multiple filters', async () => {
      mockPrismaService.feedback.findMany.mockResolvedValue([mockFeedback]);

      await service.findAll({
        status: 'NEW',
        minRating: 4,
        clinicId: 'clinic-1',
      });

      expect(mockPrismaService.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'NEW',
            clinicId: 'clinic-1',
            overallRating: { gte: 4 },
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return feedback by id', async () => {
      const feedbackWithRelations = {
        ...mockFeedback,
        user: { id: 'user-1', name: 'John', email: 'john@example.com' },
        clinic: { id: 'clinic-1', name: 'Clinic' },
      };

      mockPrismaService.feedback.findUnique.mockResolvedValue(
        feedbackWithRelations,
      );

      const result = await service.findOne('feedback-1');

      expect(result).toEqual(feedbackWithRelations);
      expect(mockPrismaService.feedback.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'feedback-1' },
        }),
      );
    });

    it('should throw NotFoundException when feedback not found', async () => {
      mockPrismaService.feedback.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent')).rejects.toThrow(
        'Feedback not found',
      );
    });
  });

  describe('findByUser', () => {
    it('should return all feedback by user', async () => {
      const feedbacks = [mockFeedback];
      mockPrismaService.feedback.findMany.mockResolvedValue(feedbacks);

      const result = await service.findByUser('user-1');

      expect(result).toEqual(feedbacks);
      expect(mockPrismaService.feedback.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when user has no feedback', async () => {
      mockPrismaService.feedback.findMany.mockResolvedValue([]);

      const result = await service.findByUser('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('updateStatus', () => {
    it('should update feedback status', async () => {
      mockPrismaService.feedback.findUnique.mockResolvedValue(mockFeedback);

      const updatedFeedback = {
        ...mockFeedback,
        status: 'REVIEWED',
        adminNotes: 'Thanks for the feedback',
      };
      mockPrismaService.feedback.update.mockResolvedValue(updatedFeedback);

      const result = await service.updateStatus('feedback-1', {
        status: 'REVIEWED',
        adminNotes: 'Thanks for the feedback',
      });

      expect(result).toEqual(updatedFeedback);
      expect(mockPrismaService.feedback.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'feedback-1' },
          data: {
            status: 'REVIEWED',
            adminNotes: 'Thanks for the feedback',
          },
        }),
      );
    });

    it('should throw NotFoundException when updating non-existent feedback', async () => {
      mockPrismaService.feedback.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('non-existent', { status: 'REVIEWED' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update status without admin notes', async () => {
      mockPrismaService.feedback.findUnique.mockResolvedValue(mockFeedback);
      mockPrismaService.feedback.update.mockResolvedValue({
        ...mockFeedback,
        status: 'RESOLVED',
      });

      await service.updateStatus('feedback-1', { status: 'RESOLVED' });

      expect(mockPrismaService.feedback.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'RESOLVED',
          }),
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should propagate database errors from create', async () => {
      const error = new Error('Database connection failed');
      mockPrismaService.feedback.create.mockRejectedValue(error);

      await expect(
        service.create('clinic-1', 'user-1', { overallRating: 5 }),
      ).rejects.toThrow('Database connection failed');
    });

    it('should propagate database errors from findMany', async () => {
      const error = new Error('Database error');
      mockPrismaService.feedback.findMany.mockRejectedValue(error);

      await expect(service.findAll()).rejects.toThrow('Database error');
    });

    it('should propagate database errors from update', async () => {
      mockPrismaService.feedback.findUnique.mockResolvedValue(mockFeedback);
      const error = new Error('Update failed');
      mockPrismaService.feedback.update.mockRejectedValue(error);

      await expect(
        service.updateStatus('feedback-1', { status: 'REVIEWED' }),
      ).rejects.toThrow('Update failed');
    });
  });
});
