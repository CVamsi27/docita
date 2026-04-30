import { BaseRepository } from './base.repository';
import { PrismaService } from '@/prisma/prisma.service';

type TestEntity = { id: string; name: string };

class TestRepository extends BaseRepository<TestEntity> {
  protected override getSearchFields(): string[] {
    return ['name'];
  }

  protected override getDefaultSelect() {
    return { id: true, name: true };
  }
}

describe('BaseRepository', () => {
  const model = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  };
  const prisma = { testModel: model } as unknown as PrismaService;
  const repository = new TestRepository(prisma, 'testModel');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses shared cursor pagination with a capped limit', async () => {
    model.findMany.mockResolvedValue(
      Array.from({ length: 101 }, (_, index) => ({
        id: `item-${index + 1}`,
        name: `Item ${index + 1}`,
      })),
    );

    const result = await repository.findAll('clinic-1', {
      limit: 500,
      search: 'test',
    });

    expect(model.findMany).toHaveBeenCalledWith({
      take: 101,
      where: {
        clinicId: 'clinic-1',
        OR: [{ name: { contains: 'test', mode: 'insensitive' } }],
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true },
    });
    expect(result.items).toHaveLength(100);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe('item-100');
  });

  it('returns an empty page when clinic context is missing', async () => {
    await expect(repository.findAll('')).resolves.toEqual({
      items: [],
      hasMore: false,
      count: 0,
    });
    expect(model.findMany).not.toHaveBeenCalled();
  });
});
