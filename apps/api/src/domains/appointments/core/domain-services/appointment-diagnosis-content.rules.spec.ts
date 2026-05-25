import { describe, expect, it } from '@jest/globals';
import { hashDiagnosesContent } from './appointment-diagnosis-content.rules';

describe('appointment-diagnosis-content.rules', () => {
  it('returns the same hash for equivalent diagnosis sets regardless of order', () => {
    const a = hashDiagnosesContent([
      { icdCodeId: 'icd-2', notes: ' B ', isPrimary: false },
      { icdCodeId: 'icd-1', notes: 'A', isPrimary: true },
    ]);
    const b = hashDiagnosesContent([
      { icdCodeId: 'icd-1', notes: 'A', isPrimary: true },
      { icdCodeId: 'icd-2', notes: 'B', isPrimary: false },
    ]);

    expect(a).toBe(b);
    expect(a).toHaveLength(32);
  });

  it('ignores entries without icdCodeId', () => {
    const withMissing = hashDiagnosesContent([
      { icdCodeId: 'icd-1', notes: 'Primary', isPrimary: true },
      { notes: 'ignored' },
    ]);
    const withoutMissing = hashDiagnosesContent([
      { icdCodeId: 'icd-1', notes: 'Primary', isPrimary: true },
    ]);

    expect(withMissing).toBe(withoutMissing);
  });
});
