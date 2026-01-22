import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionBillingService } from './subscription-billing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentGatewayFactory } from '../../gateways/payment-gateway.factory';
import { PaymentWebSocketGateway } from '../../gateways/payment.websocket.gateway';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  WHATSAPP_ADDON_PRICING,
  SubscriptionTierConfigSchema,
} from '@workspace/types';

// Mock dependencies
const mockPrismaService = {
  clinic: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  subscription: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  billingRecord: {
    create: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(mockPrismaService)),
};

const mockPaymentGateway = {
  createCustomer: jest.fn(),
  createSubscription: jest.fn(),
  cancelSubscription: jest.fn(),
  createOrder: jest.fn(),
  verifySignature: jest.fn(),
};

const mockPaymentGatewayFactory = {
  getGateway: jest.fn().mockReturnValue(mockPaymentGateway),
};

const mockConfigService = {
  get: jest.fn(),
};

describe('SubscriptionBillingService', () => {
  let service: SubscriptionBillingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionBillingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PaymentGatewayFactory, useValue: mockPaymentGatewayFactory },
        { provide: PaymentWebSocketGateway, useValue: {} }, // WebSocket gateway mock if needed
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SubscriptionBillingService>(
      SubscriptionBillingService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('previewUpgrade', () => {
    const clinicId = 'clinic-123';

    it('should calculate prorated upgrade correctly', async () => {
      // Mock active PRO subscription
      const mockClinic = {
        id: clinicId,
        tier: 'PRO',
        billingCycle: 'MONTHLY',
        subscriptionId: 'sub_123',
        subscriptionStatus: 'active',
        subscriptionEndDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days left
      };

      mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
      mockPrismaService.subscription.findUnique.mockResolvedValue({
        id: 'sub_123',
        clinicId: clinicId,
        plan: 'PRO',
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodEnd: mockClinic.subscriptionEndDate,
        razorpaySubscriptionId: 'sub_rzp_123',
        basePriceCents: 10000,
      });

      const result = await service.previewUpgrade(
        clinicId,
        'ENTERPRISE', // newTier
        'MONTHLY', // newCycle
        [], // addOns
      );

      // We expect proration logic to trigger.
      expect(result).toHaveProperty('chargeCents');
      expect(result).toHaveProperty('creditCents');
      expect(result).toHaveProperty('effectiveDate');
    });

    it('should calculate whatsapp add-on price correctly', async () => {
      const mockClinic = {
        id: clinicId,
        tier: 'PRO',
        billingCycle: 'MONTHLY',
        subscriptionId: 'sub_123',
        subscriptionStatus: 'active',
        subscriptionEndDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days left
      };
      mockPrismaService.clinic.findUnique.mockResolvedValue(mockClinic);
      mockPrismaService.subscription.findUnique.mockResolvedValue({
        id: 'sub_123',
        clinicId: clinicId,
        plan: 'PRO',
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodEnd: mockClinic.subscriptionEndDate,
        razorpaySubscriptionId: 'sub_rzp_123',
        basePriceCents: 10000,
      });

      const result = await service.previewUpgrade(
        clinicId,
        'PRO', // newTier
        'MONTHLY', // newCycle
        ['WHATSAPP'], // addOns
      );

      // result might be ProrationPreview or { isNewSubscription... }
      if ('chargeCents' in result) {
        expect(result.chargeCents).toBeGreaterThan(0);
        // Adding WhatsApp should increase price, so there should be a charge for the remainder of the period
      } else {
        throw new Error('Expected ProrationPreview with chargeCents');
      }
    });
  });

  // Add more tests for checkout, activation etc.
});
