import { Provider } from '@nestjs/common';
import { RazorpaySubscriptionGateway } from '../src/gateways/razorpay-subscription.gateway';

export const mockRazorpayGateway = {
  paymentLink: {
    create: jest.fn().mockResolvedValue({
      id: 'plink_1234567890',
      short_url: 'https://rzp.io/i/1234567890',
      status: 'created',
      amount: 10000,
      currency: 'INR',
      upi_link: true,
    }),
    fetch: jest.fn().mockResolvedValue({
      id: 'plink_1234567890',
      short_url: 'https://rzp.io/i/1234567890',
      status: 'created',
      amount: 10000,
      currency: 'INR',
    }),
  },
  createCustomer: jest.fn().mockResolvedValue({
    customerId: 'cust_1234567890',
  }),
  createCheckout: jest.fn().mockResolvedValue({
    orderId: 'order_1234567890',
  }),
  cancelSubscription: jest.fn().mockResolvedValue({}),
};

export const RazorpaySubscriptionGatewayProvider: Provider = {
  provide: RazorpaySubscriptionGateway,
  useValue: mockRazorpayGateway,
};
