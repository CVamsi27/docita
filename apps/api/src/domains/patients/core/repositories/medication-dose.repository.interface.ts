import { MedicationDose, Prisma } from '@workspace/db';

export type MedicationWithPrescription = {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  isPRN: boolean;
  prnMaxDose: string | null;
  prnInstructions: string | null;
  sigCode: string | null;
  startDate: Date | null;
  endDate: Date | null;
  prescriptionId: string;
  prescription: {
    id: string;
    patientId: string;
    date: Date;
  };
};

export type DoseAdherenceStat = {
  status: string;
  _count: { status: number };
};

export type MedicationDoseHistoryRow = Prisma.MedicationDoseGetPayload<{
  include: {
    medication: {
      select: {
        name: true;
        dosage: true;
        frequency: true;
      };
    };
  };
}>;

export type PrescriptionWithMedications = Prisma.PrescriptionGetPayload<{
  include: {
    medications: true;
  };
}>;

export interface IMedicationDoseRepository {
  verifyPatientAccess(patientId: string, clinicId: string): Promise<boolean>;

  findMedicationWithPrescription(
    medicationId: string,
  ): Promise<MedicationWithPrescription | null>;

  createDose(
    data: Prisma.MedicationDoseUncheckedCreateInput,
  ): Promise<MedicationDose>;

  findDoseById(
    id: string,
    patientId: string,
    clinicId: string,
  ): Promise<MedicationDose | null>;

  updateDose(
    id: string,
    data: Prisma.MedicationDoseUpdateInput,
  ): Promise<MedicationDose>;

  findDoses(
    where: Prisma.MedicationDoseWhereInput,
    options: { take: number; skip: number },
  ): Promise<MedicationDoseHistoryRow[]>;

  countDoses(where: Prisma.MedicationDoseWhereInput): Promise<number>;

  groupDosesByStatus(
    where: Prisma.MedicationDoseWhereInput,
  ): Promise<DoseAdherenceStat[]>;

  createManyDoses(
    data: Array<Prisma.MedicationDoseUncheckedCreateInput>,
  ): Promise<{ count: number }>;

  findPrescriptionsWithMedications(
    patientId: string,
    take: number,
  ): Promise<PrescriptionWithMedications[]>;

  findPrescriptionById(
    id: string,
    patientId: string,
  ): Promise<PrescriptionWithMedications | null>;
}

export const MEDICATION_DOSE_REPOSITORY_TOKEN = Symbol(
  'IMedicationDoseRepository',
);
