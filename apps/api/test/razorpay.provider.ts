import { Provider } from '@nestjs/common';
import { RazorpaySubscriptionGateway } from '@/gateways/razorpay-subscription.gateway';

export const mockRazorpayGateway = {
  paymentLink: {
    create: jest.fn().mockResolvedValue({
      id: 'plink_1234567890',
      short_url: 'https://rzp.io/i/plink_1234567890',
      status: 'created',
      amount: 10000,
      currency: 'INR',
      upi_link: true,
    }),
    fetch: jest.fn().mockResolvedValue({
      id: 'plink_1234567890',
      short_url: 'https://rzp.io/i/plink_1234567890',
      status: 'created',
      amount: 10000,
      currency: 'INR',
    }),
  },
  createCustomer: jest.fn().mockResolvedValue('cust_1234567890'),
  createCheckout: jest.fn().mockResolvedValue({
    razorpayOrderId: 'order_1234567890',
    amountCents: 10000,
    currency: 'INR',
  }),
  cancelSubscription: jest.fn().mockResolvedValue({}),
};

export const RazorpaySubscriptionGatewayProvider: Provider = {
  provide: RazorpaySubscriptionGateway,
  useValue: mockRazorpayGateway,
};
