import { describe, expect, it } from '@jest/globals';
import { Prisma } from '@workspace/db';
import {
  toTemplateButtons,
  toTemplateVariables,
} from './prisma-whatsapp.mappers';

describe('prisma-whatsapp.mappers', () => {
  it('parses template variables from Json via Zod', () => {
    const value: Prisma.JsonValue = [
      { name: 'patientName', required: true, defaultValue: null },
    ];

    expect(toTemplateVariables(value)).toEqual([
      { name: 'patientName', required: true, defaultValue: undefined },
    ]);
  });

  it('parses template buttons from Json via Zod', () => {
    const value: Prisma.JsonValue = [
      { id: 'btn1', text: 'Confirm', action: null },
    ];

    expect(toTemplateButtons(value)).toEqual([
      { id: 'btn1', text: 'Confirm', action: undefined },
    ]);
  });
});
