import { Test, TestingModule } from '@nestjs/testing';
import { PaymentGatewayFactory } from './payment-gateway.factory';
import { RazorpaySubscriptionGateway } from './razorpay-subscription.gateway';
import { PaymentProvider } from './payment-gateway.interface';

describe('PaymentGatewayFactory', () => {
  let factory: PaymentGatewayFactory;
  let razorpayGateway: jest.Mocked<RazorpaySubscriptionGateway>;

  beforeEach(async () => {
    const razorpayMock = {
      name: 'razorpay',
      provider: PaymentProvider.RAZORPAY,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentGatewayFactory,
        {
          provide: RazorpaySubscriptionGateway,
          useValue: razorpayMock,
        },
      ],
    }).compile();

    factory = module.get<PaymentGatewayFactory>(PaymentGatewayFactory);
    razorpayGateway = module.get(RazorpaySubscriptionGateway);
  });

  describe('getGateway', () => {
    it('should return Razorpay gateway for RAZORPAY provider', () => {
      const gateway = factory.getGateway(PaymentProvider.RAZORPAY);

      expect(gateway).toBeDefined();
      expect(gateway).toBe(razorpayGateway);
    });

    it('should throw error for unsupported provider', () => {
      const unsupportedProvider = 'STRIPE' as PaymentProvider;

      expect(() => factory.getGateway(unsupportedProvider)).toThrow(
        'Payment provider STRIPE not supported',
      );
    });

    it('should throw error for null provider', () => {
      expect(() => factory.getGateway(null as any)).toThrow();
    });

    it('should return consistent gateway on multiple calls', () => {
      const gateway1 = factory.getGateway(PaymentProvider.RAZORPAY);
      const gateway2 = factory.getGateway(PaymentProvider.RAZORPAY);

      expect(gateway1).toBe(gateway2);
    });
  });

  describe('getDefaultGateway', () => {
    it('should return Razorpay as default gateway', () => {
      const gateway = factory.getDefaultGateway();

      expect(gateway).toBe(razorpayGateway);
    });

    it('should use Razorpay for India region', () => {
      const gateway = factory.getDefaultGateway('IN');

      expect(gateway).toBe(razorpayGateway);
    });

    it('should return Razorpay for unsupported US region (fallback)', () => {
      const gateway = factory.getDefaultGateway('US');

      expect(gateway).toBe(razorpayGateway);
    });

    it('should return Razorpay for unsupported EU region (fallback)', () => {
      const gateway = factory.getDefaultGateway('EU');

      expect(gateway).toBe(razorpayGateway);
    });

    it('should return Razorpay when region is undefined', () => {
      const gateway = factory.getDefaultGateway(undefined);

      expect(gateway).toBe(razorpayGateway);
    });

    it('should return Razorpay when region is empty string', () => {
      const gateway = factory.getDefaultGateway('');

      expect(gateway).toBe(razorpayGateway);
    });

    it('should handle various region codes', () => {
      const regions = ['IN', 'US', 'EU', 'GB', 'AU'];

      regions.forEach((region) => {
        const gateway = factory.getDefaultGateway(region);
        expect(gateway).toBe(razorpayGateway);
      });
    });
  });

  describe('getSubscriptionGateway', () => {
    it('should return a valid subscription gateway', () => {
      const gateway = factory.getSubscriptionGateway();

      expect(gateway).toBeDefined();
      expect(gateway).toBe(razorpayGateway);
    });

    it('should return same gateway as RAZORPAY provider', () => {
      const subscriptionGateway = factory.getSubscriptionGateway();
      const razorpayGateway = factory.getGateway(PaymentProvider.RAZORPAY);

      expect(subscriptionGateway).toBe(razorpayGateway);
    });
  });

  describe('Integration', () => {
    it('should support multiple gateway requests', () => {
      const gateway1 = factory.getGateway(PaymentProvider.RAZORPAY);
      const defaultGateway = factory.getDefaultGateway();
      const subscriptionGateway = factory.getSubscriptionGateway();

      expect(gateway1).toBe(razorpayGateway);
      expect(defaultGateway).toBe(razorpayGateway);
      expect(subscriptionGateway).toBe(razorpayGateway);
    });

    it('should handle rapid gateway requests', () => {
      const gateways: IPaymentGateway[] = [];

      for (let i = 0; i < 100; i++) {
        if (i % 3 === 0) {
          gateways.push(factory.getGateway(PaymentProvider.RAZORPAY));
        } else if (i % 3 === 1) {
          gateways.push(factory.getDefaultGateway());
        } else {
          gateways.push(factory.getSubscriptionGateway());
        }
      }

      gateways.forEach((gateway) => {
        expect(gateway).toBe(razorpayGateway);
      });
    });
  });
});
