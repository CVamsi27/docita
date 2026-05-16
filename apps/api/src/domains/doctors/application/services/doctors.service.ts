import { Injectable } from '@nestjs/common';
import { Specialization } from '@workspace/db';
import { StorageFile } from '@/domains/documents/infrastructure/storage.provider';
import { PrismaService } from '@/prisma/prisma.service';
import { DoctorVerificationService } from './doctor-verification.service';
import { SignatureUploadService } from './signature-upload.service';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';
import { StorageProvider } from '@/domains/documents/infrastructure/storage.provider';
import { DoctorsQueryService } from './doctors-query.service';
import { DoctorsCommandService } from './doctors-command.service';
import { DoctorProfileService } from './doctor-profile.service';

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
    prisma: PrismaService,
    doctorVerificationService: DoctorVerificationService,
    signatureUploadService: SignatureUploadService,
    storedFileUrlResolver: StoredFileUrlResolverService,
    storageProvider: StorageProvider,
    profileService: DoctorProfileService,
  ) {
    this.queryService = new DoctorsQueryService(prisma, storedFileUrlResolver);
    this.commandService = new DoctorsCommandService(
      prisma,
      doctorVerificationService,
      signatureUploadService,
      storedFileUrlResolver,
      storageProvider,
      this.queryService,
      profileService,
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

  adminVerifyDoctor(doctorId: string, adminId: string, note?: string) {
    return this.commandService.adminVerifyDoctor(doctorId, adminId, note);
  }

  adminRejectDoctor(doctorId: string, adminId: string, reason: string) {
    return this.commandService.adminRejectDoctor(doctorId, adminId, reason);
  }

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
