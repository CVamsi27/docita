import { hashEmail, maskEmail } from './email-suppression.service';

describe('email suppression helpers', () => {
  it('hashes case-insensitively and stably (sha256 hex)', () => {
    expect(hashEmail('A@B.com')).toBe(hashEmail('  a@b.com '));
    expect(hashEmail('a@b.com')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('masks the local part for operator visibility', () => {
    expect(maskEmail('john@example.com')).toBe('j***@example.com');
    expect(maskEmail('not-an-email')).toBe('***');
  });
});
