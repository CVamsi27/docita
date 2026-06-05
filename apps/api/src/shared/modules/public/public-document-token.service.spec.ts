import { BadRequestException } from '@nestjs/common';
import { PublicDocumentTokenService } from './public-document-token.service';

const TEST_SECRET = 'a-32-char-secret-for-testing-only!!';

function createMockConfigService(secret: string) {
  return { getPublicDocumentSigningSecret: () => secret };
}

describe('PublicDocumentTokenService', () => {
  let service: PublicDocumentTokenService;

  beforeEach(() => {
    service = new PublicDocumentTokenService(
      createMockConfigService(TEST_SECRET) as never,
    );
  });

  describe('sign and verify round-trip', () => {
    it('signs and verifies a prescription token', () => {
      const token = service.sign('prescription', 'rx-abc-123');
      const result = service.verify(token);
      expect(result).toEqual({ type: 'prescription', id: 'rx-abc-123' });
    });

    it('signs and verifies an invoice token', () => {
      const token = service.sign('invoice', 'inv-xyz-789');
      const result = service.verify(token);
      expect(result).toEqual({ type: 'invoice', id: 'inv-xyz-789' });
    });

    it('handles IDs with colons', () => {
      const token = service.sign('type', 'id:with:colons');
      const result = service.verify(token);
      expect(result).toEqual({ type: 'type', id: 'id:with:colons' });
    });
  });

  describe('verify rejects tampered tokens', () => {
    it('rejects when signature is modified', () => {
      const token = service.sign('prescription', 'rx-123');
      const [payload] = token.split('.');
      const badToken = `${payload}.INVALIDSIGNATURE`;
      expect(() => service.verify(badToken)).toThrow(BadRequestException);
    });

    it('rejects when payload is modified', () => {
      const token = service.sign('prescription', 'rx-123');
      const [, sig] = token.split('.');
      const badPayload = Buffer.from('prescription:rx-999').toString('base64');
      const badToken = `${badPayload}.${sig}`;
      expect(() => service.verify(badToken)).toThrow(BadRequestException);
    });

    it('rejects empty token', () => {
      expect(() => service.verify('')).toThrow(BadRequestException);
    });

    it('rejects token without dot separator', () => {
      expect(() => service.verify('justastring')).toThrow(BadRequestException);
    });

    it('rejects token with invalid base64', () => {
      expect(() => service.verify('!!!.!!!')).toThrow(BadRequestException);
    });
  });

  describe('different secrets produce different signatures', () => {
    it('token signed with one secret cannot be verified with another', () => {
      const service2 = new PublicDocumentTokenService(
        createMockConfigService(
          'different-secret-that-is-32-chars-long!',
        ) as never,
      );

      const token = service.sign('prescription', 'rx-123');
      expect(() => service2.verify(token)).toThrow(BadRequestException);
    });
  });

  describe('cross-type protection', () => {
    it('rx token cannot be used as inv token', () => {
      const token = service.sign('prescription', 'rx-123');
      const { type, id } = service.verify(token);
      expect(type).toBe('prescription');
      expect(id).toBe('rx-123');
      expect(type).not.toBe('invoice');
    });
  });
});
