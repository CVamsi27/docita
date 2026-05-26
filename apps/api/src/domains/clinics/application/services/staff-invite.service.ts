import { BadRequestException, Injectable, Inject } from '@nestjs/common';
import {
  CLINIC_PERSISTENCE_PORT,
  type ClinicPersistencePort,
} from '@/domains/clinics/application/ports/clinic-persistence.port';
import * as bcrypt from 'bcrypt';
import { Role, Specialization } from '@workspace/db';
import { parseStringEnumMember } from '@workspace/utils';
import {
  isClinicFrontDesk,
  mapClinicMemberRoleToPrisma,
  type CreateClinicMemberData,
  type CreateDoctorData,
  type CreateReceptionistData,
} from './staff-management-helpers';

const SPECIALIZATION_ALIASES: Readonly<Record<string, Specialization>> = {
  GENERAL: Specialization.GENERAL_PRACTICE,
  GENERAL_PRACTICE: Specialization.GENERAL_PRACTICE,
};

// AuditLogged: all staff creation methods (doctor, receptionist, member) are sensitive writes
@Injectable()
export class StaffInviteService {
  constructor(
    @Inject(CLINIC_PERSISTENCE_PORT)
    private persistence: ClinicPersistencePort,
  ) {}

  private parseSpecialization(value: string): Specialization {
    const normalizedValue = value.trim().toUpperCase().replaceAll(/\s+/g, '_');
    const aliasedSpecialization = SPECIALIZATION_ALIASES[normalizedValue];
    if (aliasedSpecialization) {
      return aliasedSpecialization;
    }

    const specialization = parseStringEnumMember(
      Object.values(Specialization),
      value,
    );
    if (!specialization) {
      throw new BadRequestException(`Unsupported specialization: ${value}`);
    }
    return specialization;
  }

  async createDoctor(clinicId: string, data: CreateDoctorData) {
    const isFrontDesk = await isClinicFrontDesk(this.persistence, clinicId);

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const userData = {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: Role.DOCTOR,
      clinicId,
      phoneNumber: data.phoneNumber,
      qualification: data.qualification,
      registrationNumber: data.registrationNumber,
      specialization: data.specialization
        ? this.parseSpecialization(data.specialization)
        : undefined,
      ...(isFrontDesk ? { appLoginDisabled: true } : {}),
    };

    const user = await this.persistence.user.create({
      data: userData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        specialization: true,
        qualification: true,
        registrationNumber: true,
        createdAt: true,
      },
    });

    await this.persistence.doctorClinic.create({
      data: {
        doctorId: user.id,
        clinicId,
      },
    });

    return user;
  }

  async createReceptionist(clinicId: string, data: CreateReceptionistData) {
    const isFrontDesk = await isClinicFrontDesk(this.persistence, clinicId);
    if (isFrontDesk && data.role === 'NURSE') {
      throw new BadRequestException(
        'This role is not available for the front desk workspace.',
      );
    }
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.persistence.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role === 'NURSE' ? Role.NURSE : Role.RECEPTIONIST,
        clinicId,
        phoneNumber: data.phoneNumber,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        createdAt: true,
      },
    });

    return user;
  }

  async createMember(clinicId: string, data: CreateClinicMemberData) {
    const isFrontDesk = await isClinicFrontDesk(this.persistence, clinicId);
    if (isFrontDesk) {
      if (data.role === 'NURSE' || data.role === 'ADMIN_DOCTOR') {
        throw new BadRequestException(
          'This role is not available for the front desk workspace.',
        );
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const prismaRole = mapClinicMemberRoleToPrisma(data.role);
    const needsDoctorClinic =
      data.role === 'DOCTOR' || data.role === 'ADMIN_DOCTOR';

    const user = await this.persistence.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: prismaRole,
        clinicId,
        phoneNumber: data.phoneNumber,
        ...(needsDoctorClinic
          ? {
              qualification: data.qualification,
              registrationNumber: data.registrationNumber,
              specialization: data.specialization
                ? this.parseSpecialization(data.specialization)
                : undefined,
            }
          : {}),
        ...(isFrontDesk && prismaRole === Role.DOCTOR
          ? { appLoginDisabled: true }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        specialization: true,
        qualification: true,
        registrationNumber: true,
        createdAt: true,
      },
    });

    if (needsDoctorClinic) {
      await this.persistence.doctorClinic.create({
        data: {
          doctorId: user.id,
          clinicId,
        },
      });
    }

    return user;
  }
}
