import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateCustomFieldData,
  CUSTOM_FIELDS_REPOSITORY_TOKEN,
  ICustomFieldsRepository,
  UpdateCustomFieldData,
} from '@/domains/custom-fields/application/ports/custom-fields.repository.port';

/**
 * Thin facade — delegates custom-field persistence to ICustomFieldsRepository.
 */
@Injectable()
export class CustomFieldsService {
  constructor(
    @Inject(CUSTOM_FIELDS_REPOSITORY_TOKEN)
    private readonly customFieldsRepository: ICustomFieldsRepository,
  ) {}

  async findAll(clinicId?: string) {
    return this.customFieldsRepository.findAll(clinicId);
  }

  async findOne(id: string, clinicId?: string) {
    const field = await this.customFieldsRepository.findById(id);
    if (!field || (clinicId && field.clinicId !== clinicId)) {
      throw new NotFoundException(`Custom field with ID ${id} not found`);
    }
    return field;
  }

  async create(data: CreateCustomFieldData) {
    return this.customFieldsRepository.create(data);
  }

  async update(id: string, data: UpdateCustomFieldData, clinicId?: string) {
    await this.findOne(id, clinicId);
    return this.customFieldsRepository.update(id, data);
  }

  async remove(id: string, clinicId?: string) {
    await this.findOne(id, clinicId);
    return this.customFieldsRepository.delete(id);
  }
}
