import { describe, expect, it } from '@jest/globals';
import { resolvePdfCodePair, type PDFCodeOverrides } from '@workspace/types';

describe('resolvePdfCodePair', () => {
  it('prefers paired hospital mappings so CPT and ICD stay aligned', () => {
    const overrides: PDFCodeOverrides = {
      pairs: [
        {
          key: 'Consultation',
          icd: 'I10',
          cpt: '99213',
        },
      ],
    };

    expect(resolvePdfCodePair(overrides, 'Consultation')).toEqual({
      icd: 'I10',
      cpt: '99213',
    });
  });

  it('falls back to legacy maps and source codes when no pair exists', () => {
    const overrides: PDFCodeOverrides = {
      icd: {
        I10: 'I10-HOSP',
      },
      cpt: {
        Consultation: '99213-HOSP',
      },
    };

    expect(
      resolvePdfCodePair(overrides, 'Consultation', {
        icd: 'I10',
        cpt: '99213',
      }),
    ).toEqual({
      icd: 'I10-HOSP',
      cpt: '99213-HOSP',
    });
  });
});
