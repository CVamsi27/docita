export const mockTwilio = {
  messages: {
    create: jest.fn().mockResolvedValue({
      sid: 'SM_mock_' + Date.now(),
      status: 'queued',
    }),
  },
};

export const createMockTwilio = () => {
  return {
    messages: {
      create: jest.fn().mockResolvedValue({
        sid: 'SM_mock_' + Date.now(),
        status: 'queued',
      }),
    },
  };
};
