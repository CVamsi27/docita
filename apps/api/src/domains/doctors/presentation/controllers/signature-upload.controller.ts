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
import { memoryStorage } from 'multer';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { RequestWithUser } from '@/common/types/common.types';
import { Public } from '@/shared/modules/auth/auth/public.decorator';

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
      storage: memoryStorage(),
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

    const buffer = file.buffer;
    const header = buffer.toString('hex', 0, 4).toUpperCase();
    const webpHeader = buffer.toString('hex', 8, 12).toUpperCase();

    const signatures = {
      PNG: '89504E47',
      JPEG: 'FFD8FF',
      RIFF: '52494646',
    };

    let isValid = false;
    if (header === signatures.PNG) isValid = true;
    else if (header.startsWith(signatures.JPEG)) isValid = true;
    else if (header === signatures.RIFF && webpHeader === '57454250')
      isValid = true;

    if (!isValid) {
      throw new BadRequestException(
        'Invalid file content. The file type does not match its extension/MIME type.',
      );
    }

    return this.signatureUploadService.uploadSignature(token, file);
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
