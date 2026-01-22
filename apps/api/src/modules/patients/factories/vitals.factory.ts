import { Injectable } from '@nestjs/common';
import { VitalSignSchema, VitalSignInput } from '../schemas/vitals.schema';

@Injectable()
export class VitalsFactory {
  create(data: VitalSignInput) {
    const validated = VitalSignSchema.parse(data);

    // Calculate BMI if height and weight are provided and BMI is missing
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
