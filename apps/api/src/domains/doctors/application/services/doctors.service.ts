import { Injectable, Inject } from '@nestjs/common';
import { Specialization } from '@workspace/db';
import { StorageFile } from '@/domains/documents/application/ports/storage-provider.port';
import {
  DOCTOR_PERSISTENCE_PORT,
  type DoctorPersistencePort,
} from '@/domains/doctors/application/ports/doctor-persistence.port';
import {
  DOCTOR_REPOSITORY_TOKEN,
  IDoctorRepository,
} from '@/domains/doctors/core/repositories/doctor.repository.interface';
import { DoctorVerificationService } from './doctor-verification.service';
import { SignatureUploadService } from './signature-upload.service';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';
import { StorageProvider } from '@/domains/documents/application/ports/storage-provider.port';
import { DoctorsQueryService } from './doctors-query.service';
import { DoctorsCommandService } from './doctors-command.service';
import { DoctorProfileService } from './doctor-profile.service';
import { DoctorAdminVerificationCommandService } from './doctor-admin-verification-command.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';

/**
 * Facade — keeps the original constructor signature so existing consumers
 * (controllers, tests, other modules) are not broken. All work is delegated
 * to DoctorsQueryService or DoctorsCommandService.
 */
@Injectable()
export class DoctorsService {
  private readonly queryService: DoctorsQueryService;
  private readonly commandService: DoctorsCommandService;

  constructor(
    @Inject(DOCTOR_PERSISTENCE_PORT)
    prisma: DoctorPersistencePort,
    doctorVerificationService: DoctorVerificationService,
    signatureUploadService: SignatureUploadService,
    storedFileUrlResolver: StoredFileUrlResolverService,
    storageProvider: StorageProvider,
    profileService: DoctorProfileService,
    @Inject(DOCTOR_REPOSITORY_TOKEN)
    doctorRepository: IDoctorRepository,
    @Inject(CLOCK_PORT) clock: IClock,
    auditService: AuditService,
  ) {
    this.queryService = new DoctorsQueryService(prisma, storedFileUrlResolver);
    const adminVerificationService = new DoctorAdminVerificationCommandService(
      prisma,
      this.queryService,
      clock,
      auditService,
    );
    this.commandService = new DoctorsCommandService(
      doctorRepository,
      doctorVerificationService,
      signatureUploadService,
      storedFileUrlResolver,
      storageProvider,
      this.queryService,
      profileService,
      adminVerificationService,
      clock,
    );
  }

  findAll(clinicId: string) {
    return this.queryService.findAll(clinicId);
  }

  findOne(id: string, clinicId?: string) {
    return this.queryService.findOne(id, clinicId);
  }

  create(
    clinicId: string,
    data: Parameters<DoctorsCommandService['create']>[1],
  ) {
    return this.commandService.create(clinicId, data);
  }

  update(
    id: string,
    data: Parameters<DoctorsCommandService['update']>[1],
    clinicId?: string,
  ) {
    return this.commandService.update(id, data, clinicId);
  }

  createSignatureUploadSession(id: string, clinicId?: string) {
    return this.commandService.createSignatureUploadSession(id, clinicId);
  }

  reverifyDoctor(id: string, clinicId?: string) {
    return this.commandService.reverifyDoctor(id, clinicId);
  }

  /* jscpd:ignore-start */
  adminVerifyDoctor(
    doctorId: string,
    adminId: string,
    ticketId: string,
    note?: string,
  ) {
    return this.commandService.adminVerifyDoctor(
      doctorId,
      adminId,
      ticketId,
      note,
    );
  }

  adminRejectDoctor(
    doctorId: string,
    adminId: string,
    ticketId: string,
    reason: string,
  ) {
    return this.commandService.adminRejectDoctor(
      doctorId,
      adminId,
      ticketId,
      reason,
    );
  }
  /* jscpd:ignore-end */

  uploadRegistrationCertificate(doctorId: string, file: StorageFile) {
    return this.commandService.uploadRegistrationCertificate(doctorId, file);
  }

  listDoctorsForAdminReview() {
    return this.queryService.listDoctorsForAdminReview();
  }

  remove(id: string, clinicId?: string) {
    return this.commandService.remove(id, clinicId);
  }

  addEducation(
    doctorId: string,
    data: Parameters<DoctorsCommandService['addEducation']>[1],
  ) {
    return this.commandService.addEducation(doctorId, data);
  }

  updateEducation(
    educationId: string,
    data: Parameters<DoctorsCommandService['updateEducation']>[1],
    doctorId?: string,
  ) {
    return this.commandService.updateEducation(educationId, data, doctorId);
  }

  removeEducation(educationId: string, doctorId?: string) {
    return this.commandService.removeEducation(educationId, doctorId);
  }

  getEducationHistory(doctorId: string) {
    return this.queryService.getEducationHistory(doctorId);
  }

  addCertification(
    doctorId: string,
    data: Parameters<DoctorsCommandService['addCertification']>[1],
  ) {
    return this.commandService.addCertification(doctorId, data);
  }

  updateCertification(
    certificationId: string,
    data: Parameters<DoctorsCommandService['updateCertification']>[1],
    doctorId?: string,
  ) {
    return this.commandService.updateCertification(
      certificationId,
      data,
      doctorId,
    );
  }

  removeCertification(certificationId: string, doctorId?: string) {
    return this.commandService.removeCertification(certificationId, doctorId);
  }

  getCertifications(doctorId: string) {
    return this.queryService.getCertifications(doctorId);
  }

  addSpecialization(
    doctorId: string,
    specialization: Specialization,
    yearsOfPractice?: number,
  ) {
    return this.commandService.addSpecialization(
      doctorId,
      specialization,
      yearsOfPractice,
    );
  }

  removeSpecialization(doctorId: string, specialization: Specialization) {
    return this.commandService.removeSpecialization(doctorId, specialization);
  }

  getSpecializations(doctorId: string) {
    return this.queryService.getSpecializations(doctorId);
  }

  getAvailableSpecializations() {
    return this.queryService.getAvailableSpecializations();
  }

  getAvailableHospitalRoles() {
    return this.queryService.getAvailableHospitalRoles();
  }
}
