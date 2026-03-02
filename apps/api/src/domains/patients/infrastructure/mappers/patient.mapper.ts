import { Patient as PrismaPatient } from '@workspace/db';
import {
  patientPersistenceRecordSchema,
  patientPersistenceWriteSchema,
  type PatientPersistenceWrite,
} from '@workspace/types';
import { Patient } from '@/domains/patients/core/entities/patient.entity';

export class PatientMapper {
  static toDomain(raw: PrismaPatient): Patient {
    const parsed = patientPersistenceRecordSchema.parse(raw);
    const metadata =
      parsed.customData &&
      typeof parsed.customData === 'object' &&
      !Array.isArray(parsed.customData)
        ? Object.fromEntries(Object.entries(parsed.customData))
        : {};

    return new Patient({
      id: parsed.id,
      clinicId: parsed.clinicId,
      mrn: parsed.mrn || undefined,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      email: parsed.email || undefined,
      phoneNumber: parsed.phoneNumber || undefined,
      gender: parsed.gender,
      dateOfBirth: parsed.dateOfBirth || undefined,
      address: parsed.address || undefined,
      metadata,
      createdAt: parsed.createdAt,
      updatedAt: parsed.updatedAt,
      version: parsed.version,
    });
  }

  static toPersistence(domain: Patient): PatientPersistenceWrite {
    const plain = domain.toPlain();
    return patientPersistenceWriteSchema.parse({
      id: plain.id,
      clinicId: plain.clinicId,
      mrn: plain.mrn,
      firstName: plain.firstName,
      lastName: plain.lastName,
      email: plain.email,
      phoneNumber: plain.phoneNumber,
      gender: plain.gender,
      dateOfBirth: plain.dateOfBirth,
      address: plain.address,
      customData: plain.metadata,
      version: plain.version,
    });
  }
}
