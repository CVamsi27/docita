// jscpd:ignore-start
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
import { SignatureUploadService } from '@/domains/doctors/application/services/signature-upload.service';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import {
  createSignatureFileInterceptor,
  handleSignatureUpload,
} from '@/shared/common/utils/signature-controller.utils';
import { SignatureTokenValidationResponseDto } from '@/shared/common/dto/signature-response.dto';
// The upload response is a discriminated union, which createZodDto cannot wrap,
// so the serializer takes the schema itself.
import { signatureUploadResponseSchema } from '@workspace/types';
import { ZodSerializerDto } from 'nestjs-zod';

@Controller('doctors/signature')
export class SignatureUploadController {
  constructor(
    private readonly signatureUploadService: SignatureUploadService,
  ) {}

  @Post('generate-token')
  @Roles(Role.DOCTOR, Role.ADMIN, Role.ADMIN_DOCTOR)
  async generateToken(@Request() req: RequestWithUser) {
    if (!req.user?.id) throw new BadRequestException('User ID is required');

    const doctorId = req.user.id;

    return this.signatureUploadService.generateUploadToken(doctorId);
  }

  @Get('validate-token/:token')
  @Public()
  @ZodSerializerDto(SignatureTokenValidationResponseDto)
  async validateToken(@Param('token') token: string) {
    return this.signatureUploadService.validateToken(token);
  }

  @Post('upload/:token')
  @Public()
  @ZodSerializerDto(signatureUploadResponseSchema)
  @UseInterceptors(createSignatureFileInterceptor())
  async uploadSignature(
    @Param('token') token: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return handleSignatureUpload(this.signatureUploadService, token, file);
  }

  @Get('active-tokens')
  @Roles(Role.DOCTOR, Role.ADMIN, Role.ADMIN_DOCTOR)
  // jscpd:ignore-end
  async getActiveTokens(@Request() req: RequestWithUser) {
    if (!req.user?.id) throw new BadRequestException('User ID is required');

    const doctorId = req.user.id;

    return this.signatureUploadService.getActiveTokens(doctorId);
  }

  @Delete('token/:tokenId')
  @Roles(Role.DOCTOR, Role.ADMIN, Role.ADMIN_DOCTOR)
  async revokeToken(
    @Request() req: RequestWithUser,
    @Param('tokenId') tokenId: string,
  ) {
    if (!req.user?.id) throw new BadRequestException('User ID is required');

    const doctorId = req.user.id;

    return this.signatureUploadService.revokeToken(doctorId, tokenId);
  }
}
