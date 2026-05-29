import { describe, expect, it } from 'vitest';
import {
  docitaPublicInvoiceUrl,
  docitaPublicPayUrl,
  docitaPublicRxUrl,
  toWhatsAppUrlButtonToken,
} from './whatsapp-public-links.js';

describe('whatsapp-public-links', () => {
  it('builds fixed-domain patient URLs', () => {
    expect(docitaPublicRxUrl('abc123')).toBe('https://docita.work/rx/abc123');
    expect(docitaPublicInvoiceUrl('inv-1')).toBe(
      'https://docita.work/inv/inv-1',
    );
    expect(docitaPublicPayUrl('ps-1')).toBe('https://docita.work/pay/ps-1');
  });

  it('extracts path token from full URLs for legacy callers', () => {
    expect(toWhatsAppUrlButtonToken('abc123')).toBe('abc123');
    expect(toWhatsAppUrlButtonToken('https://docita.work/rx/abc123')).toBe(
      'abc123',
    );
    expect(toWhatsAppUrlButtonToken('https://rzp.io/i/xyz')).toBe('xyz');
  });
});
