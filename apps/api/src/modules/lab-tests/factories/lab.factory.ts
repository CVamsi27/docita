import { Injectable } from '@nestjs/common';
import { LabTestOrderStatus } from '@workspace/db';
import {
  LabTestInput,
  LabTestSchema,
  CreateLabOrderInput,
  CreateLabOrderSchema,
  UpdateLabOrderInput,
  UpdateLabOrderSchema,
} from '../schemas/lab.schema';

@Injectable()
export class LabFactory {
  createTest(data: LabTestInput) {
    return LabTestSchema.parse(data);
  }

  createOrder(data: CreateLabOrderInput) {
    const validated = CreateLabOrderSchema.parse(data);
    return {
      ...validated,
      status: LabTestOrderStatus.ORDERED,
    };
  }

  updateOrder(data: UpdateLabOrderInput) {
    return UpdateLabOrderSchema.parse(data);
  }
}
