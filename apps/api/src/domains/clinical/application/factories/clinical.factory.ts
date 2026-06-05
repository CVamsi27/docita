import { Injectable } from '@nestjs/common';
import { LabTest } from '@/domains/clinical/core/entities/lab-test.entity';
import { LabOrder } from '@/domains/clinical/core/entities/lab-order.entity';
import { LabTestOrderStatus } from '@workspace/db';

function toLabTestInput(
  data: Record<string, unknown>,
): Parameters<typeof LabTest.create>[0] {
  return {
    id: stringField(data.id),
    name: stringField(data.name) ?? '',
    category: stringField(data.category) ?? '',
    clinicId: stringField(data.clinicId) ?? '',
    active: booleanField(data.active),
    code: stringField(data.code),
    price: numberField(data.price),
    description: stringField(data.description),
  };
}

function toLabOrderInput(
  data: Record<string, unknown>,
): Parameters<typeof LabOrder.create>[0] {
  return {
    id: stringField(data.id),
    patientId: stringField(data.patientId) ?? '',
    labTestId: stringField(data.labTestId) ?? '',
    status: LabTestOrderStatus.ORDERED,
    clinicId: stringField(data.clinicId) ?? '',
    appointmentId: stringField(data.appointmentId),
    result: recordField(data.result),
    resultUrl: stringField(data.resultUrl),
    notes: stringField(data.notes),
    createdAt: dateField(data.createdAt),
    updatedAt: dateField(data.updatedAt),
  };
}

function stringField(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function numberField(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function booleanField(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function dateField(value: unknown): Date | undefined {
  return value instanceof Date ? value : undefined;
}

function recordField(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : undefined;
}

@Injectable()
export class ClinicalFactory {
  createLabTest(data: Record<string, unknown>): LabTest {
    return LabTest.create(toLabTestInput(data));
  }

  createLabOrder(data: Record<string, unknown>): LabOrder {
    return LabOrder.create(toLabOrderInput(data));
  }
}
