import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import {
  type IPatientTagsRepository,
  PATIENT_TAGS_REPOSITORY_TOKEN,
} from '@/domains/patients/core/repositories/patient-tags.repository.interface';
import { Patient } from '@/domains/patients/core/entities/patient.entity';

/**
 * Thin facade — delegates patient tag persistence to IPatientTagsRepository.
 */
@Injectable()
export class PatientTagsService {
  constructor(
    @Inject(PATIENT_TAGS_REPOSITORY_TOKEN)
    private readonly patientTagsRepository: IPatientTagsRepository,
  ) {}

  async list(params: { clinicId: string; patientId: string }) {
    if (!(await this.patientTagsRepository.patientExists(params))) {
      throw new NotFoundException('Patient not found');
    }

    return this.patientTagsRepository.list({ patientId: params.patientId });
  }

  async create(params: {
    clinicId: string;
    patientId: string;
    tag: string;
    color: string;
  }) {
    if (!(await this.patientTagsRepository.patientExists(params))) {
      throw new NotFoundException('Patient not found');
    }

    const normalizedTag = Patient.normalizeTagLabel(params.tag);
    if (!Patient.isTagLabelValid(params.tag)) {
      throw new BadRequestException('Tag is required');
    }

    return this.patientTagsRepository.create({
      patientId: params.patientId,
      tag: normalizedTag,
      color: params.color,
    });
  }

  async update(params: {
    clinicId: string;
    patientId: string;
    tagId: string;
    tag?: string;
    color?: string;
  }) {
    if (!(await this.patientTagsRepository.patientExists(params))) {
      throw new NotFoundException('Patient not found');
    }

    const existing = await this.patientTagsRepository.findTag({
      patientId: params.patientId,
      tagId: params.tagId,
    });
    if (!existing) throw new NotFoundException('Tag not found');

    return this.patientTagsRepository.update({
      tagId: params.tagId,
      ...(params.tag !== undefined
        ? { tag: Patient.normalizeTagLabel(params.tag) }
        : {}),
      ...(params.color !== undefined ? { color: params.color } : {}),
    });
  }

  async remove(params: { clinicId: string; patientId: string; tagId: string }) {
    if (!(await this.patientTagsRepository.patientExists(params))) {
      throw new NotFoundException('Patient not found');
    }

    const existing = await this.patientTagsRepository.findTag({
      patientId: params.patientId,
      tagId: params.tagId,
    });
    if (!existing) throw new NotFoundException('Tag not found');

    await this.patientTagsRepository.remove({ tagId: params.tagId });
  }
}
