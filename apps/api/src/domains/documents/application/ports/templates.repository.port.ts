export interface CreateTemplateData {
  name: string;
  speciality: string;
  fields: Record<string, unknown>[];
  defaultObservations?: string;
  clinicId?: string;
}

export interface UpdateTemplateData {
  name?: string;
  speciality?: string;
  fields?: Record<string, unknown>[];
  defaultObservations?: string;
}

export interface TemplateQuery {
  search?: string;
  speciality?: string;
  clinicId?: string;
}

export type TemplateRecord = Record<string, unknown> & {
  id: string;
  clinicId: string | null;
};

export interface ITemplatesRepository {
  create(data: CreateTemplateData): Promise<TemplateRecord>;
  findAll(params?: TemplateQuery): Promise<TemplateRecord[]>;
  findById(id: string): Promise<TemplateRecord | null>;
  update(id: string, data: UpdateTemplateData): Promise<TemplateRecord>;
  delete(id: string): Promise<TemplateRecord>;
}

export const TEMPLATES_REPOSITORY_TOKEN = 'ITemplatesRepository';
