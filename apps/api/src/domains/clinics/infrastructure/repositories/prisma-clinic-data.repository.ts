import { Injectable } from '@nestjs/common';
import { Role } from '@workspace/db';
import { IClinicDataRepository } from '@/domains/clinics/core/repositories/clinic-data.repository.interface';
import type {
  CreateClinicInput,
  UpdateClinicInput,
} from '@/domains/clinics/core/repositories/clinic-repository.types';
import { PrismaClinicCoreRepository } from './prisma-clinic-core.repository';
import { PrismaClinicMembershipRepository } from './prisma-clinic-membership.repository';

@Injectable()
export class PrismaClinicDataRepository implements IClinicDataRepository {
  constructor(
    private readonly core: PrismaClinicCoreRepository,
    private readonly membership: PrismaClinicMembershipRepository,
  ) {}

  findByReferralCode(code: string) {
    return this.core.findByReferralCode(code);
  }

  create(data: CreateClinicInput) {
    return this.core.create(data);
  }

  findAll() {
    return this.core.findAll();
  }

  findById(id: string) {
    return this.core.findById(id);
  }

  update(id: string, data: UpdateClinicInput) {
    return this.core.update(id, data);
  }

  softDelete(id: string) {
    return this.core.softDelete(id);
  }

  findDoctorClinics(doctorId: string) {
    return this.core.findDoctorClinics(doctorId);
  }

  getStats(clinicId: string) {
    return this.core.getStats(clinicId);
  }

  findClinicByCodeOrEmail(code?: string, email?: string) {
    return this.core.findClinicByCodeOrEmail(code, email);
  }

  searchActive(query: string) {
    return this.core.searchActive(query);
  }

  findUserForJoin(userId: string) {
    return this.membership.findUserForJoin(userId);
  }

  joinClinic(userId: string, clinicId: string, userRole: Role) {
    return this.membership.joinClinic(userId, clinicId, userRole);
  }
}
