import {
  generateReferrerCode,
  isValidReferrerCode,
  normalizeReferrerCodeInput,
  referrerCodeLength,
  REFERRER_CODE_GENERATION_ALPHABET,
} from './referral-code.rules';

describe('referral-code.rules', () => {
  describe('generateReferrerCode', () => {
    it('emits a code that matches the RFR-XXXXXX format', () => {
      for (let i = 0; i < 200; i += 1) {
        const code = generateReferrerCode();
        expect(isValidReferrerCode(code)).toBe(true);
      }
    });

    it('always uses the unambiguous alphabet (no I, O, 0, 1)', () => {
      for (let i = 0; i < 500; i += 1) {
        const code = generateReferrerCode();
        const suffix = code.slice(4);
        for (const ch of suffix) {
          expect(REFERRER_CODE_GENERATION_ALPHABET).toContain(ch);
        }
      }
    });

    it('produces codes of the documented total length', () => {
      for (let i = 0; i < 50; i += 1) {
        expect(generateReferrerCode().length).toBe(referrerCodeLength());
      }
    });

    it('produces high-entropy output (collision-free over 10k draws)', () => {
      const seen = new Set<string>();
      for (let i = 0; i < 10_000; i += 1) {
        seen.add(generateReferrerCode());
      }
      // 32^6 = ~1.07B possible codes; 10k draws should be effectively
      // collision-free. Allow up to 1 collision just to be safe against
      // a freak bad RNG draw, but expect 0 in practice.
      expect(seen.size).toBeGreaterThanOrEqual(9_999);
    });
  });

  describe('isValidReferrerCode', () => {
    it('accepts a freshly generated code', () => {
      expect(isValidReferrerCode(generateReferrerCode())).toBe(true);
    });

    it('accepts the canonical example', () => {
      expect(isValidReferrerCode('RFR-AB12CD')).toBe(true);
    });

    it('rejects lowercase input', () => {
      expect(isValidReferrerCode('rfr-ab12cd')).toBe(false);
    });

    it('rejects ambiguous glyphs (I, O, 0, 1)', () => {
      expect(isValidReferrerCode('RFR-IO0101')).toBe(false);
      expect(isValidReferrerCode('RFR-AB0000')).toBe(false);
    });

    it('rejects wrong prefix', () => {
      expect(isValidReferrerCode('DOC-AB12CD')).toBe(false);
      expect(isValidReferrerCode('AB12CD')).toBe(false);
    });

    it('rejects too-short / too-long input', () => {
      expect(isValidReferrerCode('RFR-AB12C')).toBe(false);
      expect(isValidReferrerCode('RFR-AB12CDE')).toBe(false);
    });

    it('rejects non-strings and empty strings', () => {
      expect(isValidReferrerCode(null)).toBe(false);
      expect(isValidReferrerCode(undefined)).toBe(false);
      expect(isValidReferrerCode(123)).toBe(false);
      expect(isValidReferrerCode('')).toBe(false);
    });
  });

  describe('normalizeReferrerCodeInput', () => {
    it('uppercases and trims before validating', () => {
      expect(normalizeReferrerCodeInput('  rfr-ab12cd  ')).toBe('RFR-AB12CD');
    });

    it('returns null on invalid input', () => {
      expect(normalizeReferrerCodeInput('nope')).toBeNull();
      expect(normalizeReferrerCodeInput('RFR-IO0101')).toBeNull();
    });

    it('returns null on non-strings', () => {
      expect(normalizeReferrerCodeInput(null as unknown as string)).toBeNull();
      expect(normalizeReferrerCodeInput(undefined as unknown as string)).toBeNull();
    });
  });
});
