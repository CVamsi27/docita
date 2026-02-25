import { Injectable } from '@nestjs/common';
import { LabTest } from '../../core/entities/lab-test.entity';
import { LabOrder } from '../../core/entities/lab-order.entity';
import { LabTestOrderStatus } from '@workspace/db';

@Injectable()
export class ClinicalFactory {
  createLabTest(data: Record<string, any>): LabTest {
    return LabTest.create(data as any);
  }

  createLabOrder(data: Record<string, any>): LabOrder {
    return LabOrder.create({
      ...data,
      status: LabTestOrderStatus.ORDERED,
    } as any);
  }
}
