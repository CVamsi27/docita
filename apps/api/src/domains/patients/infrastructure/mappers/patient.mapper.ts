import { Patient as PrismaPatient } from '@workspace/db';
import { Patient } from '../../core/entities/patient.entity';

export class PatientMapper {
  static toDomain(raw: PrismaPatient): Patient {
    return new Patient({
      id: raw.id,
      clinicId: raw.clinicId,
      mrn: raw.mrn || undefined,
      firstName: raw.firstName,
      lastName: raw.lastName,
      email: raw.email || undefined,
      phoneNumber: raw.phoneNumber || undefined,
      gender: raw.gender,
      dateOfBirth: raw.dateOfBirth || undefined,
      address: raw.address || undefined,
      metadata: (raw.customData as Record<string, unknown>) || {},
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version,
    });
  }

  static toPersistence(domain: Patient): Record<string, unknown> {
    const plain = domain.toPlain();
    return {
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
    };
  }
}
