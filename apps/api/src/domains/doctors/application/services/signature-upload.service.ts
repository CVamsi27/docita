import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  StorageProvider,
  StorageFile,
} from '@/domains/documents/application/ports/storage-provider.port';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';
import { Role, SignaturePurpose } from '@workspace/db';
import {
  ISignatureUploadRepository,
  SIGNATURE_UPLOAD_REPOSITORY_TOKEN,
} from '@/domains/doctors/core/repositories/signature-upload.repository.interface';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

/**
 * Facade — delegates signature file storage to ISignatureUploadRepository and StorageProvider.
 */
@Injectable()
export class SignatureUploadService {
  private readonly logger = new Logger(SignatureUploadService.name);

  constructor(
    @Inject(SIGNATURE_UPLOAD_REPOSITORY_TOKEN)
    private readonly repository: ISignatureUploadRepository,
    private readonly storageProvider: StorageProvider,
    private readonly storedFileUrlResolver: StoredFileUrlResolverService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  private async resolveDoctorSignatureUrl<
    T extends { signatureUrl?: string | null },
  >(
    doctor: T | null | undefined,
  ): Promise<
    | (T & { signatureUrl?: string | null; signatureStoredUrl?: string | null })
    | null
  > {
    if (!doctor) return null;

    const resolved = await this.storedFileUrlResolver.resolveWithStoredUrl(
      doctor.signatureUrl ?? null,
    );

    return {
      ...doctor,
      signatureUrl: resolved.url ?? undefined,
      signatureStoredUrl: resolved.storedUrl ?? undefined,
    };
  }

  private async resolveClinicSignatureUrl<
    T extends { slaSignatureUrl?: string | null },
  >(
    clinic: T | null | undefined,
  ): Promise<
    | (T & {
        slaSignatureUrl?: string | null;
        slaSignatureStoredUrl?: string | null;
      })
    | null
  > {
    if (!clinic) return null;

    const resolved = await this.storedFileUrlResolver.resolveWithStoredUrl(
      clinic.slaSignatureUrl ?? null,
    );

    return {
      ...clinic,
      slaSignatureUrl: resolved.url ?? undefined,
      slaSignatureStoredUrl: resolved.storedUrl ?? undefined,
    };
  }

  async generateUploadToken(
    userId: string,
    options?: { purpose?: SignaturePurpose; clinicId?: string },
  ) {
    const purpose = options?.purpose ?? SignaturePurpose.DOCTOR_PRESCRIPTION;
    const clinicId = options?.clinicId;

    if (purpose === SignaturePurpose.DOCTOR_PRESCRIPTION) {
      const doctor = await this.repository.findUserById(userId);

      if (!doctor) throw new NotFoundException('Doctor not found');

      if (doctor.role !== Role.DOCTOR && doctor.role !== Role.ADMIN_DOCTOR)
        throw new BadRequestException(
          'Only doctors can upload prescription signatures',
        );

      const token = randomBytes(32).toString('hex');
      const expiresAt = this.clock.now();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      const uploadToken = await this.repository.createUploadToken({
        doctorId: userId,
        token,
        expiresAt,
        purpose,
      });

      return {
        token: uploadToken.token,
        expiresAt: uploadToken.expiresAt,
        uploadUrl: `/upload-signature/${uploadToken.token}`,
      };
    }

    if (!clinicId)
      throw new BadRequestException(
        'clinicId is required for SLA_ACCEPTANCE tokens',
      );

    const clinic = await this.repository.findClinicById(clinicId);

    if (!clinic) throw new NotFoundException('Clinic not found');

    const token = randomBytes(32).toString('hex');
    const expiresAt = this.clock.now();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const uploadToken = await this.repository.createUploadToken({
      doctorId: userId,
      clinicId,
      token,
      expiresAt,
      purpose,
    });

    return {
      token: uploadToken.token,
      expiresAt: uploadToken.expiresAt,
      uploadUrl: `/upload-signature/${uploadToken.token}`,
    };
  }

  async validateToken(token: string) {
    const uploadToken = await this.repository.findTokenByValue(token);

    if (!uploadToken) throw new NotFoundException('Invalid upload token');

    if (uploadToken.used)
      throw new BadRequestException('Token has already been used');

    if (this.clock.now() > uploadToken.expiresAt)
      throw new BadRequestException('Token has expired');

    return {
      tokenId: uploadToken.id,
      purpose: uploadToken.purpose,
      doctor: await this.resolveDoctorSignatureUrl(uploadToken.doctor),
      clinic: await this.resolveClinicSignatureUrl(uploadToken.clinic),
    };
  }

  async uploadSignature(token: string, file: StorageFile) {
    const validation = await this.validateToken(token);

    this.logger.log({
      action: 'signature.upload',
      clinicId: validation.clinic?.id,
      userId: validation.doctor?.id,
      purpose: validation.purpose,
    });

    if (!file.mimetype.startsWith('image/'))
      throw new BadRequestException('File must be an image');

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize)
      throw new BadRequestException('File size must not exceed 5MB');

    const modifiedAt = this.clock.now().toISOString();
    const fileUrl = await this.storageProvider.upload(file, 'signatures', {
      metadata: {
        asset_type: 'signature',
        signature_purpose: validation.purpose,
        signature_token_id: validation.tokenId,
        doctor_id: validation.doctor?.id,
        clinic_id: validation.clinic?.id,
        modified_at: modifiedAt,
        modified_by: validation.doctor?.id || 'token-holder',
        auth_method: 'signed-upload-token',
      },
    });
    const resolvedFileUrl =
      await this.storedFileUrlResolver.resolveWithStoredUrl(fileUrl);

    if (
      validation.purpose === SignaturePurpose.SLA_ACCEPTANCE &&
      validation.clinic
    ) {
      await this.repository.updateClinicSignature(
        validation.clinic.id,
        fileUrl,
        token,
      );
      return {
        success: true,
        signatureUrl: resolvedFileUrl.url ?? fileUrl,
        signatureStoredUrl: resolvedFileUrl.storedUrl ?? fileUrl,
        purpose: SignaturePurpose.SLA_ACCEPTANCE,
        clinic: { id: validation.clinic.id, name: validation.clinic.name },
      };
    }

    if (!validation.doctor)
      throw new BadRequestException('Invalid token: no associated doctor');

    await this.repository.updateDoctorSignature(
      validation.doctor.id,
      fileUrl,
      token,
    );

    return {
      success: true,
      signatureUrl: resolvedFileUrl.url ?? fileUrl,
      signatureStoredUrl: resolvedFileUrl.storedUrl ?? fileUrl,
      purpose: SignaturePurpose.DOCTOR_PRESCRIPTION,
      doctor: { id: validation.doctor.id, name: validation.doctor.name },
    };
  }

  async getActiveTokens(userId: string, clinicId?: string) {
    if (clinicId) return this.repository.findActiveTokensByClinic(clinicId);

    const user = await this.repository.findUserById(userId);
    if (!user) throw new NotFoundException('User not found');

    return this.repository.findActiveTokensByDoctor(userId);
  }

  async revokeToken(userId: string, tokenId: string) {
    const token = await this.repository.findTokenById(tokenId, userId);

    if (!token) throw new NotFoundException('Token not found');

    await this.repository.markTokenUsedById(tokenId);
    return { success: true };
  }

  async revokeClinicToken(clinicId: string, tokenId: string) {
    const token = await this.repository.findClinicTokenById(tokenId, clinicId);

    if (!token) throw new NotFoundException('Token not found');

    await this.repository.markTokenUsedById(tokenId);
    return { success: true };
  }
}
