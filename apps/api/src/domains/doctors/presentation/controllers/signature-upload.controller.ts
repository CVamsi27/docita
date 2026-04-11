import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SignatureUploadService } from '@/domains/doctors/application/services/signature-upload.service';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { RequestWithUser } from '@/common/types/common.types';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import {
  assertAllowedFileSignature,
  createTempDiskStorage,
} from '@/common/utils/upload.utils';
import { unlink } from 'fs/promises';

@Controller('doctors/signature')
export class SignatureUploadController {
  constructor(
    private readonly signatureUploadService: SignatureUploadService,
  ) {}

  @Post('generate-token')
  @Roles(Role.DOCTOR, Role.ADMIN, Role.ADMIN_DOCTOR)
  async generateToken(@Request() req: RequestWithUser) {
    if (!req.user?.id) {
      throw new BadRequestException('User ID is required');
    }

    const doctorId = req.user.id;

    return this.signatureUploadService.generateUploadToken(doctorId);
  }

  @Get('validate-token/:token')
  @Public()
  async validateToken(@Param('token') token: string) {
    return this.signatureUploadService.validateToken(token);
  }

  @Post('upload/:token')
  @Public()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: createTempDiskStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (_req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
        ];
        if (!allowedMimes.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Only images (JPEG, PNG, WebP) are allowed',
            ),
            false,
          );
        }

        cb(null, true);
      },
    }),
  )
  async uploadSignature(
    @Param('token') token: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    try {
      await assertAllowedFileSignature(file, ['png', 'jpeg', 'webp']);
      return await this.signatureUploadService.uploadSignature(token, file);
    } catch (error) {
      if (file.path) {
        await unlink(file.path).catch(() => {});
      }
      throw error;
    }
  }

  @Get('active-tokens')
  @Roles(Role.DOCTOR, Role.ADMIN, Role.ADMIN_DOCTOR)
  async getActiveTokens(@Request() req: RequestWithUser) {
    if (!req.user?.id) {
      throw new BadRequestException('User ID is required');
    }

    const doctorId = req.user.id;

    return this.signatureUploadService.getActiveTokens(doctorId);
  }

  @Delete('token/:tokenId')
  @Roles(Role.DOCTOR, Role.ADMIN, Role.ADMIN_DOCTOR)
  async revokeToken(
    @Request() req: RequestWithUser,
    @Param('tokenId') tokenId: string,
  ) {
    if (!req.user?.id) {
      throw new BadRequestException('User ID is required');
    }

    const doctorId = req.user.id;

    return this.signatureUploadService.revokeToken(doctorId, tokenId);
  }
}
