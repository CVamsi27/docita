import { Inject, Injectable } from '@nestjs/common';
import {
  CreateTemplateData,
  ITemplatesRepository,
  TEMPLATES_REPOSITORY_TOKEN,
  TemplateQuery,
  UpdateTemplateData,
} from '@/domains/documents/application/ports/templates.repository.port';

/**
 * Thin facade — delegates template persistence to ITemplatesRepository.
 */
@Injectable()
export class TemplatesService {
  constructor(
    @Inject(TEMPLATES_REPOSITORY_TOKEN)
    private readonly templatesRepository: ITemplatesRepository,
  ) {}

  create(data: CreateTemplateData) {
    return this.templatesRepository.create(data);
  }

  findAll(params?: TemplateQuery) {
    return this.templatesRepository.findAll(params);
  }

  findOne(id: string) {
    return this.templatesRepository.findById(id);
  }

  update(id: string, data: UpdateTemplateData) {
    return this.templatesRepository.update(id, data);
  }

  remove(id: string) {
    return this.templatesRepository.delete(id);
  }
}
