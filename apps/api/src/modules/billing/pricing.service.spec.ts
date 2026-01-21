import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from './pricing.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('PricingService', () => {
  let service: PricingService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        {
          provide: PrismaService,
          useValue: {
            tierPricing: { findMany: jest.fn().mockResolvedValue([]) },
            addOn: { findMany: jest.fn().mockResolvedValue([]) },
            discount: { findMany: jest.fn().mockResolvedValue([]) },
          },
        },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should return addOns as an Array in fallback mode', async () => {
    const config = await service.getPricingConfig('INR');
    expect(Array.isArray(config.addOns)).toBe(true);
    expect(config.addOns).toHaveLength(2);
    expect(config.addOns[0]).toHaveProperty('id', 'WHATSAPP');
  });
});
