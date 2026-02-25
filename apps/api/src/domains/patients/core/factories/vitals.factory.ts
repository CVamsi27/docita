import { Injectable } from '@nestjs/common';
import { vitalSignSchema, VitalSign } from '@workspace/types';

@Injectable()
export class VitalsFactory {
  create(data: Record<string, unknown>): VitalSign {
    const validated = vitalSignSchema.parse(data);

    if (!validated.bmi && validated.height && validated.weight) {
      const heightInMeters = validated.height / 100;
      if (heightInMeters > 0) {
        validated.bmi =
          Math.round(
            (validated.weight / (heightInMeters * heightInMeters)) * 10,
          ) / 10;
      }
    }

    return validated;
  }
}
