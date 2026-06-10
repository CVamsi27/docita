import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IPatientRepository,
  PatientSearchParams,
} from '@/domains/patients/core/repositories/patient.repository.interface';
import { Patient } from '@/domains/patients/core/entities/patient.entity';
import { PatientMapper } from '@/domains/patients/infrastructure/mappers/patient.mapper';
import { Prisma, Gender } from '@workspace/db';
import { parseStringEnumMember } from '@workspace/utils';

const GENDER_VALUES = Object.values(Gender);

const PATIENT_PERSISTENCE_SELECT = {
  id: true,
  clinicId: true,
  mrn: true,
  firstName: true,
  lastName: true,
  email: true,
  phoneNumber: true,
  gender: true,
  dateOfBirth: true,
  address: true,
  insuranceProvider: true,
  insurancePolicyNumber: true,
  insuranceGroupNumber: true,
  abhaAddress: true,
  customData: true,
  createdAt: true,
  updatedAt: true,
  version: true,
} as const;

@Injectable()
export class PrismaPatientRepository implements IPatientRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  async findById(id: string, clinicId: string): Promise<Patient | null> {
    const readClient = this.getReadClient();
    const item = await readClient.patient.findFirst({
      // Exclude soft-deleted patients from default reads. Callers needing
      // deleted rows (admin restore flow) should query directly.
      where: { id, clinicId, deletedAt: null },
      select: PATIENT_PERSISTENCE_SELECT,
    });
    if (!item) return null;
    return PatientMapper.toDomain(item);
  }

  async findByMrn(mrn: string, clinicId: string): Promise<Patient | null> {
    const readClient = this.getReadClient();
    const item = await readClient.patient.findFirst({
      where: { mrn, clinicId, deletedAt: null },
      select: PATIENT_PERSISTENCE_SELECT,
    });
    if (!item) return null;
    return PatientMapper.toDomain(item);
  }

  async findByClinicIdAndPhoneNumber(
    clinicId: string,
    phoneNumber: string,
  ): Promise<Patient | null> {
    const readClient = this.getReadClient();
    const item = await readClient.patient.findFirst({
      where: { clinicId, phoneNumber, deletedAt: null },
      select: PATIENT_PERSISTENCE_SELECT,
    });
    if (!item) return null;
    return PatientMapper.toDomain(item);
  }

  async findAll(params: PatientSearchParams): Promise<{
    items: Patient[];
    total: number;
    count: number;
    hasMore: boolean;
  }> {
    const readClient = this.getReadClient();
    const { clinicId, search, gender, page = 1, limit = 20 } = params;

    const where: Prisma.PatientWhereInput = {
      clinicId,
      deletedAt: null,
    };

    if (gender) {
      const parsedGender = parseStringEnumMember(GENDER_VALUES, gender);
      if (parsedGender) {
        where.gender = parsedGender;
      }
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
        { mrn: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      readClient.patient.count({ where }),
      readClient.patient.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: PATIENT_PERSISTENCE_SELECT,
      }),
    ]);

    return {
      items: items.map((item) => PatientMapper.toDomain(item)),
      total,
      count: total,
      hasMore: page * limit < total,
    };
  }

  async save(patient: Patient): Promise<void> {
    await this.prisma.patient.create({
      data: PatientMapper.toPrismaUncheckedCreateInput(patient),
    });
  }

  async update(patient: Patient): Promise<void> {
    const { id, clinicId } = PatientMapper.toPersistence(patient);
    if (!id || typeof id !== 'string')
      throw new BadRequestException('Patient id is required for update');
    if (!clinicId || typeof clinicId !== 'string')
      throw new BadRequestException('Patient clinicId is required for update');
    const result = await this.prisma.patient.updateMany({
      where: { id, clinicId },
      data: {
        ...PatientMapper.toPrismaUncheckedUpdateInput(patient),
        version: { increment: 1 },
      },
    });
    if (result.count === 0) {
      throw new NotFoundException(`Patient ${id} not found`);
    }
  }

  async delete(id: string, clinicId: string): Promise<void> {
    await this.prisma.patient.deleteMany({ where: { id, clinicId } });
  }
}
