import { Injectable } from '@nestjs/common';
import { AdmissionInput, AdmissionSchema } from '../schemas/admission.schema';
import { AdmissionStatus } from '@workspace/db';

@Injectable()
export class IpdFactory {
  createAdmission(data: AdmissionInput) {
    const validated = AdmissionSchema.parse(data);

    return {
      ...validated,
      status: AdmissionStatus.ADMITTED,
      admittedAt: validated.admittedAt || new Date(),
    };
  }
}
