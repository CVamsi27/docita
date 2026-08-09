import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackService } from './feedback.service';
import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import {
  FEEDBACK_REPOSITORY_TOKEN,
  CreateFeedbackData,
  IFeedbackRepository,
} from '@/domains/feedback/core/repositories/feedback.repository.interface';
import type { FeedbackFilters } from './feedback-helpers';
import { FeedbackCategory, FeedbackStatus } from '@workspace/db';
import { clockPortTestProvider } from '@/test-utils';

describe('FeedbackService', () => {
  let service: FeedbackService;

  const mockFeedbackPersistenceMock = {
    feedback: {
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      count: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      groupBy: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      aggregate: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    feedbackFeature: {
      groupBy: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
  };

  const buildWhere = (filters: {
    status?: string;
    category?: string;
    clinicId?: string;
    minRating?: number;
    maxRating?: number;
    search?: string;
  }) => {
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;
    if (filters.clinicId) where.clinicId = filters.clinicId;
    if (filters.minRating || filters.maxRating) {
      where.overallRating = {
        ...(filters.minRating ? { gte: filters.minRating } : {}),
        ...(filters.maxRating ? { lte: filters.maxRating } : {}),
      };
    }
    if (filters.search) {
      where.OR = [
        { featureRequests: { contains: filters.search } },
        { generalComments: { contains: filters.search } },
      ];
    }
    return where;
  };

  const mockFeedbackRepository: IFeedbackRepository = {
    create: jest.fn(async (data: CreateFeedbackData) =>
      mockFeedbackPersistenceMock.feedback.create({
        data: {
          ...data,
          status: 'NEW',
          feedbackFeatures: { create: data.feedbackFeatures },
        },
        include: {},
      }),
    ),
    findAllForClinic: jest.fn(
      (clinicId) =>
        mockFeedbackPersistenceMock.feedback.findMany({
          where: { clinicId },
          include: {},
          orderBy: { createdAt: 'desc' },
        }) as Promise<unknown[]>,
    ),
    findAll: jest.fn(
      (filters: FeedbackFilters) =>
        mockFeedbackPersistenceMock.feedback.findMany({
          where: buildWhere(filters),
          include: {},
          orderBy: { createdAt: 'desc' },
        }) as Promise<unknown[]>,
    ),
    findOneRaw: jest.fn((id) =>
      mockFeedbackPersistenceMock.feedback.findUnique({
        where: { id },
        include: {},
      }),
    ),
    findByUser: jest.fn(
      (userId) =>
        mockFeedbackPersistenceMock.feedback.findMany({
          where: { userId },
          include: {},
          orderBy: { createdAt: 'desc' },
        }) as Promise<unknown[]>,
    ),
    updateStatus: jest.fn((id, data) =>
      mockFeedbackPersistenceMock.feedback.update({
        where: { id },
        data,
        include: {},
      }),
    ),
    delete: jest.fn((id) =>
      mockFeedbackPersistenceMock.feedback.update({
        where: { id },
        data: { deletedAt: expect.any(Date) },
      }),
    ),
    computeStats: jest.fn(async (clinicId) => {
      const where = clinicId ? { clinicId } : {};
      const total = (await mockFeedbackPersistenceMock.feedback.count({
        where,
      })) as number;
      const byStatus = (await mockFeedbackPersistenceMock.feedback.groupBy({
        by: ['status'],
        where,
        _count: true,
      })) as Array<{ status: never; _count: number }>;
      const byCategory = (await mockFeedbackPersistenceMock.feedback.groupBy({
        by: ['category'],
        where,
        _count: true,
      })) as Array<{ category: never; _count: number }>;
      const rating = (await mockFeedbackPersistenceMock.feedback.aggregate({
        where,
        _avg: { overallRating: true },
      })) as { _avg: { overallRating: number | null } };
      const recentCount = (await mockFeedbackPersistenceMock.feedback.count({
        where,
      })) as number;
      const topGood =
        (await mockFeedbackPersistenceMock.feedbackFeature.groupBy({
          by: ['feature'],
          where,
          _count: { feature: true },
        })) as Array<{ feature: string; _count: { feature: number } }>;
      const topBad = (await mockFeedbackPersistenceMock.feedbackFeature.groupBy(
        {
          by: ['feature'],
          where,
          _count: { feature: true },
        },
      )) as Array<{ feature: string; _count: { feature: number } }>;
      const topImprovement =
        (await mockFeedbackPersistenceMock.feedbackFeature.groupBy({
          by: ['feature'],
          where,
          _count: { feature: true },
        })) as Array<{ feature: string; _count: { feature: number } }>;

      return {
        total,
        byStatus,
        byCategory,
        avgRating: rating._avg.overallRating,
        recentCount,
        topGood: topGood.map((item) => ({
          feature: item.feature,
          count: item._count.feature,
        })),
        topBad: topBad.map((item) => ({
          feature: item.feature,
          count: item._count.feature,
        })),
        topImprovement: topImprovement.map((item) => ({
          feature: item.feature,
          count: item._count.feature,
        })),
      };
    }),
    hasFeedbackInWindow: jest.fn(async () => false),
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
          provide: FEEDBACK_REPOSITORY_TOKEN,
          useValue: mockFeedbackRepository,
        },
        clockPortTestProvider(),
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
    jest.clearAllMocks();
  });

  describe('Dependency Injection', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
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

      mockFeedbackPersistenceMock.feedback.create.mockResolvedValue(
        feedbackWithRelations,
      );

      const result = await service.create('clinic-1', 'user-1', createData);

      expect(result).toEqual(feedbackWithRelations);
      expect(mockFeedbackPersistenceMock.feedback.create).toHaveBeenCalledWith({
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
      mockFeedbackPersistenceMock.feedback.create.mockResolvedValue(
        mockFeedback,
      );

      await service.create('clinic-1', 'user-1', {
        overallRating: 5,
      });

      expect(mockFeedbackPersistenceMock.feedback.create).toHaveBeenCalledWith(
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
      mockFeedbackPersistenceMock.feedback.create.mockResolvedValue(
        mockFeedback,
      );

      await service.create('clinic-1', 'user-1', {
        overallRating: 3,
      });

      expect(mockFeedbackPersistenceMock.feedback.create).toHaveBeenCalledWith(
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
      mockFeedbackPersistenceMock.feedback.findMany.mockResolvedValue(
        feedbacks,
      );

      const result = await service.findAllForClinic('clinic-1');

      expect(result).toEqual(feedbacks);
      expect(
        mockFeedbackPersistenceMock.feedback.findMany,
      ).toHaveBeenCalledWith({
        where: { clinicId: 'clinic-1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no feedback exists', async () => {
      mockFeedbackPersistenceMock.feedback.findMany.mockResolvedValue([]);

      const result = await service.findAllForClinic('clinic-1');

      expect(result).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('should return all feedback without filters', async () => {
      const feedbacks = [mockFeedback];
      mockFeedbackPersistenceMock.feedback.findMany.mockResolvedValue(
        feedbacks,
      );

      const result = await service.findAll();

      expect(result).toEqual(feedbacks);
      expect(
        mockFeedbackPersistenceMock.feedback.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });

    it('should filter by status', async () => {
      mockFeedbackPersistenceMock.feedback.findMany.mockResolvedValue([
        mockFeedback,
      ]);

      await service.findAll({ status: FeedbackStatus.REVIEWED });

      expect(
        mockFeedbackPersistenceMock.feedback.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'REVIEWED' },
        }),
      );
    });

    it('should filter by category', async () => {
      mockFeedbackPersistenceMock.feedback.findMany.mockResolvedValue([
        mockFeedback,
      ]);

      await service.findAll({ category: FeedbackCategory.UI_UX });

      expect(
        mockFeedbackPersistenceMock.feedback.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { category: FeedbackCategory.UI_UX },
        }),
      );
    });

    it('should filter by clinicId', async () => {
      mockFeedbackPersistenceMock.feedback.findMany.mockResolvedValue([
        mockFeedback,
      ]);

      await service.findAll({ clinicId: 'clinic-1' });

      expect(
        mockFeedbackPersistenceMock.feedback.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clinicId: 'clinic-1' },
        }),
      );
    });

    it('should filter by minimum rating', async () => {
      mockFeedbackPersistenceMock.feedback.findMany.mockResolvedValue([
        mockFeedback,
      ]);

      await service.findAll({ minRating: 4 });

      expect(
        mockFeedbackPersistenceMock.feedback.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { overallRating: { gte: 4 } },
        }),
      );
    });

    it('should filter by maximum rating', async () => {
      mockFeedbackPersistenceMock.feedback.findMany.mockResolvedValue([
        mockFeedback,
      ]);

      await service.findAll({ maxRating: 3 });

      expect(
        mockFeedbackPersistenceMock.feedback.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { overallRating: { lte: 3 } },
        }),
      );
    });

    it('should filter by rating range', async () => {
      mockFeedbackPersistenceMock.feedback.findMany.mockResolvedValue([
        mockFeedback,
      ]);

      await service.findAll({ minRating: 3, maxRating: 5 });

      expect(
        mockFeedbackPersistenceMock.feedback.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { overallRating: { gte: 3, lte: 5 } },
        }),
      );
    });

    it('should forward the limit cap to the repository', async () => {
      mockFeedbackPersistenceMock.feedback.findMany.mockResolvedValue([
        mockFeedback,
      ]);

      await service.findAll({ limit: 100 });

      expect(mockFeedbackRepository.findAll).toHaveBeenCalledWith({
        limit: 100,
      });
    });

    it('should filter by search text', async () => {
      mockFeedbackPersistenceMock.feedback.findMany.mockResolvedValue([
        mockFeedback,
      ]);

      await service.findAll({ search: 'telehealth' });

      expect(
        mockFeedbackPersistenceMock.feedback.findMany,
      ).toHaveBeenCalledWith(
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
      mockFeedbackPersistenceMock.feedback.findMany.mockResolvedValue([
        mockFeedback,
      ]);

      await service.findAll({
        status: 'NEW',
        minRating: 4,
        clinicId: 'clinic-1',
      });

      expect(
        mockFeedbackPersistenceMock.feedback.findMany,
      ).toHaveBeenCalledWith(
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

      mockFeedbackPersistenceMock.feedback.findUnique.mockResolvedValue(
        feedbackWithRelations,
      );

      const result = await service.findOne('feedback-1');

      expect(result).toEqual(feedbackWithRelations);
      expect(
        mockFeedbackPersistenceMock.feedback.findUnique,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'feedback-1' },
        }),
      );
    });

    it('should throw NotFoundException when feedback not found', async () => {
      mockFeedbackPersistenceMock.feedback.findUnique.mockResolvedValue(null);

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
      mockFeedbackPersistenceMock.feedback.findMany.mockResolvedValue(
        feedbacks,
      );

      const result = await service.findByUser('user-1');

      expect(result).toEqual(feedbacks);
      expect(
        mockFeedbackPersistenceMock.feedback.findMany,
      ).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when user has no feedback', async () => {
      mockFeedbackPersistenceMock.feedback.findMany.mockResolvedValue([]);

      const result = await service.findByUser('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('updateStatus', () => {
    it('should update feedback status', async () => {
      mockFeedbackPersistenceMock.feedback.findUnique.mockResolvedValue(
        mockFeedback,
      );

      const updatedFeedback = {
        ...mockFeedback,
        status: 'REVIEWED',
        adminNotes: 'Thanks for the feedback',
      };
      mockFeedbackPersistenceMock.feedback.update.mockResolvedValue(
        updatedFeedback,
      );

      const result = await service.updateStatus('feedback-1', {
        status: 'REVIEWED',
        adminNotes: 'Thanks for the feedback',
      });

      expect(result).toEqual(updatedFeedback);
      expect(mockFeedbackPersistenceMock.feedback.update).toHaveBeenCalledWith(
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
      mockFeedbackPersistenceMock.feedback.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('non-existent', { status: 'REVIEWED' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update status without admin notes', async () => {
      mockFeedbackPersistenceMock.feedback.findUnique.mockResolvedValue(
        mockFeedback,
      );
      mockFeedbackPersistenceMock.feedback.update.mockResolvedValue({
        ...mockFeedback,
        status: 'RESOLVED',
      });

      await service.updateStatus('feedback-1', { status: 'RESOLVED' });

      expect(mockFeedbackPersistenceMock.feedback.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'RESOLVED',
          }),
        }),
      );
    });
  });

  describe('getStats', () => {
    it('should aggregate feature stats from normalized feedback features', async () => {
      mockFeedbackPersistenceMock.feedback.count
        .mockResolvedValueOnce(12)
        .mockResolvedValueOnce(3);
      mockFeedbackPersistenceMock.feedback.groupBy
        .mockResolvedValueOnce([{ status: 'NEW', _count: 10 }])
        .mockResolvedValueOnce([{ category: 'GENERAL', _count: 9 }]);
      mockFeedbackPersistenceMock.feedback.aggregate.mockResolvedValue({
        _avg: { overallRating: 4.2 },
      });
      mockFeedbackPersistenceMock.feedbackFeature.groupBy
        .mockResolvedValueOnce([
          { feature: 'Ease of use', _count: { feature: 4 } },
        ])
        .mockResolvedValueOnce([{ feature: 'Reports', _count: { feature: 2 } }])
        .mockResolvedValueOnce([
          { feature: 'Mobile app', _count: { feature: 3 } },
        ]);

      const result = await service.getStats('clinic-1');

      expect(result.total).toBe(12);
      expect(result.recentFeedback).toBe(3);
      expect(result.averageRating).toBe(4.2);
      expect(result.topGoodFeatures).toEqual([
        { feature: 'Ease of use', count: 4 },
      ]);
      expect(result.topBadFeatures).toEqual([{ feature: 'Reports', count: 2 }]);
      expect(result.topImprovementAreas).toEqual([
        { feature: 'Mobile app', count: 3 },
      ]);
    });
  });

  describe('Error Handling', () => {
    it('should propagate database errors from create', async () => {
      const error = new Error('Database connection failed');
      mockFeedbackPersistenceMock.feedback.create.mockRejectedValue(error);

      await expect(
        service.create('clinic-1', 'user-1', { overallRating: 5 }),
      ).rejects.toThrow('Database connection failed');
    });

    it('should propagate database errors from findMany', async () => {
      const error = new Error('Database error');
      mockFeedbackPersistenceMock.feedback.findMany.mockRejectedValue(error);

      await expect(service.findAll()).rejects.toThrow('Database error');
    });

    it('should propagate database errors from update', async () => {
      mockFeedbackPersistenceMock.feedback.findUnique.mockResolvedValue(
        mockFeedback,
      );
      const error = new Error('Update failed');
      mockFeedbackPersistenceMock.feedback.update.mockRejectedValue(error);

      await expect(
        service.updateStatus('feedback-1', { status: 'REVIEWED' }),
      ).rejects.toThrow('Update failed');
    });
  });
});
