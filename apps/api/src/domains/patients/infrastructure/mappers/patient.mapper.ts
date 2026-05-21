import { Prisma } from '@workspace/db';
import {
  patientPersistenceRecordSchema,
  patientPersistenceWriteSchema,
  type PatientPersistenceRecord,
  type PatientPersistenceWrite,
} from '@workspace/types';
import { Patient } from '@/domains/patients/core/entities/patient.entity';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';

export class PatientMapper {
  static toDomain(raw: PatientPersistenceRecord): Patient {
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

  static toPrismaUncheckedCreateInput(
    domain: Patient,
  ): Prisma.PatientUncheckedCreateInput {
    const write = PatientMapper.toPersistence(domain);
    if (!write.dateOfBirth) {
      throw new Error('Patient dateOfBirth is required for persistence');
    }
    if (!write.phoneNumber) {
      throw new Error('Patient phoneNumber is required for persistence');
    }
    return {
      id: write.id,
      clinicId: write.clinicId,
      mrn: write.mrn ?? undefined,
      firstName: write.firstName,
      lastName: write.lastName,
      email: write.email ?? undefined,
      phoneNumber: write.phoneNumber,
      gender: write.gender,
      dateOfBirth: write.dateOfBirth,
      address: write.address ?? undefined,
      customData:
        write.customData === undefined || write.customData === null
          ? undefined
          : toPrismaInputJsonValue(write.customData),
      version: write.version,
    };
  }

  static toPrismaUncheckedUpdateInput(
    domain: Patient,
  ): Prisma.PatientUncheckedUpdateInput {
    const write = PatientMapper.toPersistence(domain);
    return {
      mrn: write.mrn ?? undefined,
      firstName: write.firstName,
      lastName: write.lastName,
      email: write.email ?? undefined,
      phoneNumber: write.phoneNumber ?? undefined,
      gender: write.gender,
      ...(write.dateOfBirth ? { dateOfBirth: write.dateOfBirth } : {}),
      address: write.address ?? undefined,
      customData:
        write.customData === undefined || write.customData === null
          ? undefined
          : toPrismaInputJsonValue(write.customData),
      version: write.version,
    };
  }
}
