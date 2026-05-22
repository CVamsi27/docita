export interface CreateCustomFieldData {
  name: string;
  fieldType: string;
  required?: boolean;
  options?: string;
  order?: number;
  clinicId?: string;
}

export interface UpdateCustomFieldData {
  name?: string;
  fieldType?: string;
  required?: boolean;
  options?: string;
  order?: number;
}

export interface CustomFieldRecord {
  id: string;
  name: string;
  fieldType: string;
  required: boolean;
  options: string | null;
  order: number;
  clinicId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomFieldsRepository {
  findAll(clinicId?: string): Promise<CustomFieldRecord[]>;
  findById(id: string): Promise<CustomFieldRecord | null>;
  create(data: CreateCustomFieldData): Promise<CustomFieldRecord>;
  update(id: string, data: UpdateCustomFieldData): Promise<CustomFieldRecord>;
  delete(id: string): Promise<CustomFieldRecord>;
}

export const CUSTOM_FIELDS_REPOSITORY_TOKEN = 'ICustomFieldsRepository';
