import { jest } from '@jest/globals';

export const mockNlmCodingService = {
  searchIcdCodes: jest
    .fn<(...args: unknown[]) => Promise<unknown>>()
    .mockResolvedValue([]),
  searchCptCodes: jest
    .fn<(...args: unknown[]) => Promise<unknown>>()
    .mockResolvedValue([]),
};

export const NLM_CODING_SERVICE_TOKEN = 'NlmCodingService';
