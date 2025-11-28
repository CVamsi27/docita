export const mockRazorpay = {
  paymentLink: {
    create: jest.fn().mockResolvedValue({
      id: 'plink_mock_123',
      amount: 50000,
      currency: 'INR',
      short_url: 'https://rzp.io/mock',
      status: 'created',
    }),
    fetch: jest.fn().mockResolvedValue({
      id: 'plink_mock_123',
      status: 'paid',
    }),
  },
};

export const createMockRazorpay = () => {
  return {
    paymentLink: {
      create: jest.fn().mockResolvedValue({
        id: 'plink_mock_' + Date.now(),
        amount: 50000,
        currency: 'INR',
        short_url: 'https://rzp.io/mock',
        status: 'created',
      }),
      fetch: jest.fn().mockResolvedValue({
        id: 'plink_mock_' + Date.now(),
        status: 'paid',
      }),
    },
  };
};
