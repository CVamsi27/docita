import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CreatePrescriptionTemplateData,
  IPrescriptionTemplatesRepository,
  PRESCRIPTION_TEMPLATES_REPOSITORY_TOKEN,
  UpdatePrescriptionTemplateData,
} from '@/domains/prescriptions/prescription-templates/application/ports/prescription-templates.repository.port';

/**
 * Thin facade — delegates prescription template persistence to IPrescriptionTemplatesRepository.
 */
@Injectable()
export class PrescriptionTemplatesService {
  constructor(
    @Inject(PRESCRIPTION_TEMPLATES_REPOSITORY_TOKEN)
    private readonly prescriptionTemplatesRepository: IPrescriptionTemplatesRepository,
  ) {}

  async findAll(userId: string) {
    return this.prescriptionTemplatesRepository.findAll(userId);
  }

  async findOne(id: string, userId?: string) {
    const template = await this.prescriptionTemplatesRepository.findById(id);
    if (!template || (userId && template.userId !== userId)) {
      throw new NotFoundException(
        `Prescription template with ID ${id} not found`,
      );
    }
    return template;
  }

  async create(userId: string, data: CreatePrescriptionTemplateData) {
    return this.prescriptionTemplatesRepository.create(userId, data);
  }

  async update(
    id: string,
    data: UpdatePrescriptionTemplateData,
    userId?: string,
  ) {
    await this.findOne(id, userId);
    return this.prescriptionTemplatesRepository.update(id, data);
  }

  async remove(id: string, userId?: string) {
    await this.findOne(id, userId);
    return this.prescriptionTemplatesRepository.delete(id);
  }
}
