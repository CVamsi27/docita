import type { z } from 'zod';
import { createPatientMetricValueSchema } from '@workspace/types';

type PatientMetricValueInput = z.infer<typeof createPatientMetricValueSchema>;

/** Definition IDs requested for selection that are not valid for the patient. */
export function findInvalidMetricDefinitionIds(
  requestedIds: readonly string[],
  validDefinitions: readonly { id: string }[],
): string[] {
  const validIds = new Set(validDefinitions.map((definition) => definition.id));
  const uniqueRequested = [...new Set(requestedIds)];
  return uniqueRequested.filter((id) => !validIds.has(id));
}

/** True when at least one structured metric value field is present. */
export function hasStructuredMetricValue(
  input: PatientMetricValueInput,
): boolean {
  return (
    input.valueString !== undefined ||
    input.valueNumber !== undefined ||
    input.valueBoolean !== undefined ||
    input.valueDate !== undefined ||
    input.valueJson !== undefined ||
    input.optionId !== undefined ||
    (input.optionIds !== undefined && input.optionIds.length > 0)
  );
}
