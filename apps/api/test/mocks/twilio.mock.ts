export const mockWhatsAppService = {
  sendMessage: jest.fn().mockResolvedValue({
    success: true,
    messageId: 'wamid_mock_' + Date.now(),
  }),
  sendTemplate: jest.fn().mockResolvedValue({
    success: true,
    messageId: 'wamid_mock_' + Date.now(),
  }),
  sendInteractiveButtons: jest.fn().mockResolvedValue({
    success: true,
    messageId: 'wamid_mock_' + Date.now(),
  }),
  validateWebhookSignature: jest.fn().mockReturnValue(true),
  getVerifyToken: jest.fn().mockReturnValue('mock_verify_token'),
};

export const createMockWhatsAppService = () => {
  return {
    sendMessage: jest.fn().mockResolvedValue({
      success: true,
      messageId: 'wamid_mock_' + Date.now(),
    }),
    sendTemplate: jest.fn().mockResolvedValue({
      success: true,
      messageId: 'wamid_mock_' + Date.now(),
    }),
    sendInteractiveButtons: jest.fn().mockResolvedValue({
      success: true,
      messageId: 'wamid_mock_' + Date.now(),
    }),
    validateWebhookSignature: jest.fn().mockReturnValue(true),
    getVerifyToken: jest.fn().mockReturnValue('mock_verify_token'),
  };
};

export const mockTwilio = mockWhatsAppService;
export const createMockTwilio = createMockWhatsAppService;
