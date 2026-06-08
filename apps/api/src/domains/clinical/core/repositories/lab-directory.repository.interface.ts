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

export interface LabDirectoryRepository {
  findAllLabs(clinicId: string): Promise<LabRecord[]>;
  findLabById(id: string, clinicId: string): Promise<LabRecord | null>;
  createLab(
    clinicId: string,
    data: {
      name: string;
      type: LabType;
      phone?: string;
      email?: string;
      address?: string;
    },
  ): Promise<LabRecord>;
  updateLab(
    id: string,
    clinicId: string,
    data: Partial<{
      name: string;
      type: LabType;
      phone: string;
      email: string;
      address: string;
      active: boolean;
    }>,
  ): Promise<LabRecord>;
}
