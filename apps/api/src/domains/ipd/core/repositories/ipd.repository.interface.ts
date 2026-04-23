import type {
  Admission,
  AdmitPatientRequest,
  DischargePatientRequest,
  TransferPatientRequest,
  Ward,
} from '@workspace/types';

export interface WardWithRooms extends Ward {
  rooms: Array<{
    id: string;
    wardId: string;
    roomNumber: string;
    type?: string | null;
    charges: number;
    createdAt: string | Date;
    updatedAt: string | Date;
    beds: Array<{
      id: string;
      roomId: string;
      bedNumber: string;
      status: string;
      createdAt: string | Date;
      updatedAt: string | Date;
    }>;
  }>;
}

export interface IpdRepository {
  listWards(clinicId: string, search?: string): Promise<WardWithRooms[]>;
  listAdmissions(clinicId: string, status?: string): Promise<Admission[]>;
  admitPatient(
    clinicId: string,
    input: AdmitPatientRequest,
  ): Promise<Admission>;
  transferPatient(
    clinicId: string,
    input: TransferPatientRequest,
  ): Promise<Admission>;
  dischargePatient(
    clinicId: string,
    input: DischargePatientRequest,
  ): Promise<Admission>;
}

export const IPD_REPOSITORY_TOKEN = Symbol('IPD_REPOSITORY_TOKEN');
