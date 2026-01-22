import { Test, TestingModule } from '@nestjs/testing';
import { AiFactory } from './ai.factory';
import { z } from 'zod';

describe('AiFactory', () => {
  let factory: AiFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiFactory],
    }).compile();

    factory = module.get<AiFactory>(AiFactory);
  });

  it('should be defined', () => {
    expect(factory).toBeDefined();
  });

  describe('createPrompt', () => {
    it('should interpolate context values into user prompt', () => {
      const template = { user: 'Hello {{name}}' };
      const context = { name: 'World' };
      const prompt = factory.createPrompt(template, context);

      expect(prompt.user).toBe('Hello World');
      expect(prompt.context).toEqual(context);
    });

    it('should handle missing context values', () => {
      const template = { user: 'Hello {{name}}' };
      const context = {};
      const prompt = factory.createPrompt(template, context);

      expect(prompt.user).toBe('Hello {{name}}');
    });

    it('should interpolate system prompt if provided', () => {
      const template = { system: 'You are {{role}}', user: 'Hi' };
      const context = { role: 'Assistant' };
      const prompt = factory.createPrompt(template, context);

      expect(prompt.system).toBe('You are Assistant');
    });
  });

  describe('validateResponse', () => {
    const Schema = z.object({ result: z.string() });

    it('should parse valid JSON response against schema', () => {
      const json = '{"result": "success"}';
      const result = factory.validateResponse(Schema, json);
      expect(result).toEqual({ result: 'success' });
    });

    it('should throw error for invalid JSON', () => {
      const json = '{invalid-json}';
      expect(() => factory.validateResponse(Schema, json)).toThrow(
        /Failed to parse AI response as JSON/,
      );
    });

    it('should throw error for schema mismatch', () => {
      const json = '{"wrongKey": "value"}';
      expect(() => factory.validateResponse(Schema, json)).toThrow();
    });
  });
});
