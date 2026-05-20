import {
  Controller,
  Post,
  Param,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { unlink } from 'fs/promises';
import { assertAllowedFileSignature } from '@/shared/common/utils/upload.utils';
import { DoctorsService } from '@/domains/doctors/application/services/doctors.service';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { Role } from '@workspace/db';
import { RequestWithUser } from '@/shared/common/types/common.types';
import {
  DoctorsApiAccess,
  assertDoctorUpdatesSelf,
} from '@/domains/doctors/presentation/controllers/doctors.controller.access';
import { registrationCertificateUploadOptions } from '@/domains/doctors/presentation/controllers/doctors.controller.upload';

@Controller('doctors')
@DoctorsApiAccess()
export class DoctorsComplianceController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Post(':id/signature-upload-session')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  async createSignatureUploadSession(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    return this.doctorsService.createSignatureUploadSession(
      id,
      req.user?.clinicId || undefined,
    );
  }

  @Post(':id/reverify-registration')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  async reverifyRegistration(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    return this.doctorsService.reverifyDoctor(
      id,
      req.user?.clinicId || undefined,
    );
  }

  @Post(':id/registration-certificate')
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.DOCTOR)
  @UseInterceptors(
    FileInterceptor('file', registrationCertificateUploadOptions),
  )
  async uploadRegistrationCertificate(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    assertDoctorUpdatesSelf(
      req,
      id,
      'Doctors can only upload their own registration certificate',
    );
    if (!file) {
      throw new BadRequestException('File is required');
    }
    try {
      await assertAllowedFileSignature(file, ['pdf', 'png', 'jpeg']);
      return await this.doctorsService.uploadRegistrationCertificate(id, file);
    } catch (error) {
      if (file.path) {
        await unlink(file.path).catch(() => {});
      }
      throw error;
    }
  }
}
