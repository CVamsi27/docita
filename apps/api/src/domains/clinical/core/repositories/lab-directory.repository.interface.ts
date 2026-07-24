import { LabType } from '@workspace/db';

export interface LabRecord {
  id: string;
  clinicId: string;
  name: string;
  type: LabType;
  phone: string | null;
  email: string | null;
  address: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateLabInput = {
  name: string;
  type: LabType;
  phone?: string;
  email?: string;
  address?: string;
};

export type UpdateLabInput = Partial<{
  name: string;
  type: LabType;
  phone: string;
  email: string;
  address: string;
  active: boolean;
}>;

export interface LabDirectoryRepository {
  findAllLabs(clinicId: string): Promise<LabRecord[]>;
  findLabById(id: string, clinicId: string): Promise<LabRecord | null>;
  createLab(clinicId: string, data: CreateLabInput): Promise<LabRecord>;
  updateLab(
    id: string,
    clinicId: string,
    data: UpdateLabInput,
  ): Promise<LabRecord>;
}
