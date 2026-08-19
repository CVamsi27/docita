import { describe, expect, it } from 'vitest';
import { escapeHtml } from '../security';

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
  });

  it('returns empty string for non-string input', () => {
    expect(escapeHtml(null as unknown as string)).toBe('');
    expect(escapeHtml(undefined as unknown as string)).toBe('');
  });

  it('passes through safe strings unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});
