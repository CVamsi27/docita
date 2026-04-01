import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  StorageProvider,
  StorageFile,
} from '@/domains/documents/infrastructure/storage.provider';
import { SignaturePurpose } from '@workspace/db';
import {
  ISignatureUploadRepository,
  SIGNATURE_UPLOAD_REPOSITORY_TOKEN,
} from '@/domains/doctors/core/repositories/signature-upload.repository.interface';

@Injectable()
export class SignatureUploadService {
  constructor(
    @Inject(SIGNATURE_UPLOAD_REPOSITORY_TOKEN)
    private readonly repository: ISignatureUploadRepository,
    private readonly storageProvider: StorageProvider,
  ) {}

  async generateUploadToken(
    userId: string,
    options?: { purpose?: SignaturePurpose; clinicId?: string },
  ) {
    const purpose = options?.purpose ?? SignaturePurpose.DOCTOR_PRESCRIPTION;
    const clinicId = options?.clinicId;

    if (purpose === SignaturePurpose.DOCTOR_PRESCRIPTION) {
      const doctor = await this.repository.findUserById(userId);

      if (!doctor) {
        throw new NotFoundException('Doctor not found');
      }

      if (doctor.role !== 'DOCTOR' && doctor.role !== 'ADMIN_DOCTOR') {
        throw new BadRequestException(
          'Only doctors can upload prescription signatures',
        );
      }

      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date();
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

    if (!clinicId) {
      throw new BadRequestException(
        'clinicId is required for SLA_ACCEPTANCE tokens',
      );
    }

    const clinic = await this.repository.findClinicById(clinicId);

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
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

    if (!uploadToken) {
      throw new NotFoundException('Invalid upload token');
    }

    if (uploadToken.used) {
      throw new BadRequestException('Token has already been used');
    }

    if (new Date() > uploadToken.expiresAt) {
      throw new BadRequestException('Token has expired');
    }

    return {
      tokenId: uploadToken.id,
      purpose: uploadToken.purpose,
      doctor: uploadToken.doctor,
      clinic: uploadToken.clinic,
    };
  }

  async uploadSignature(token: string, file: StorageFile) {
    const validation = await this.validateToken(token);

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size must not exceed 5MB');
    }

    const modifiedAt = new Date().toISOString();
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
        signatureUrl: fileUrl,
        purpose: SignaturePurpose.SLA_ACCEPTANCE,
        clinic: {
          id: validation.clinic.id,
          name: validation.clinic.name,
        },
      };
    }

    if (!validation.doctor) {
      throw new BadRequestException('Invalid token: no associated doctor');
    }

    await this.repository.updateDoctorSignature(
      validation.doctor.id,
      fileUrl,
      token,
    );

    return {
      success: true,
      signatureUrl: fileUrl,
      purpose: SignaturePurpose.DOCTOR_PRESCRIPTION,
      doctor: {
        id: validation.doctor.id,
        name: validation.doctor.name,
      },
    };
  }

  async getActiveTokens(userId: string, clinicId?: string) {
    if (clinicId) {
      return this.repository.findActiveTokensByClinic(clinicId);
    }

    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.repository.findActiveTokensByDoctor(userId);
  }

  async revokeToken(userId: string, tokenId: string) {
    const token = await this.repository.findTokenById(tokenId, userId);

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    await this.repository.markTokenUsedById(tokenId);
    return { success: true };
  }

  async revokeClinicToken(clinicId: string, tokenId: string) {
    const token = await this.repository.findClinicTokenById(tokenId, clinicId);

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    await this.repository.markTokenUsedById(tokenId);
    return { success: true };
  }
}
