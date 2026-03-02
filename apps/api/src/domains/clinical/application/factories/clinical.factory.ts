import { Injectable } from '@nestjs/common';
import { LabTest } from '@/domains/clinical/core/entities/lab-test.entity';
import { LabOrder } from '@/domains/clinical/core/entities/lab-order.entity';
import { LabTestOrderStatus } from '@workspace/db';

function toLabTestInput(
  data: Record<string, unknown>,
): Parameters<typeof LabTest.create>[0] {
  return {
    id: typeof data.id === 'string' ? data.id : undefined,
    name: typeof data.name === 'string' ? data.name : '',
    category: typeof data.category === 'string' ? data.category : '',
    clinicId: typeof data.clinicId === 'string' ? data.clinicId : '',
    active: typeof data.active === 'boolean' ? data.active : undefined,
    code: typeof data.code === 'string' ? data.code : undefined,
    price: typeof data.price === 'number' ? data.price : undefined,
    description:
      typeof data.description === 'string' ? data.description : undefined,
  };
}

function toLabOrderInput(
  data: Record<string, unknown>,
): Parameters<typeof LabOrder.create>[0] {
  return {
    id: typeof data.id === 'string' ? data.id : undefined,
    patientId: typeof data.patientId === 'string' ? data.patientId : '',
    labTestId: typeof data.labTestId === 'string' ? data.labTestId : '',
    status: LabTestOrderStatus.ORDERED,
    clinicId: typeof data.clinicId === 'string' ? data.clinicId : '',
    appointmentId:
      typeof data.appointmentId === 'string' ? data.appointmentId : undefined,
    result:
      data.result &&
      typeof data.result === 'object' &&
      !Array.isArray(data.result)
        ? Object.fromEntries(Object.entries(data.result))
        : undefined,
    resultUrl: typeof data.resultUrl === 'string' ? data.resultUrl : undefined,
    notes: typeof data.notes === 'string' ? data.notes : undefined,
    createdAt: data.createdAt instanceof Date ? data.createdAt : undefined,
    updatedAt: data.updatedAt instanceof Date ? data.updatedAt : undefined,
  };
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
