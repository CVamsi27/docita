import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Request,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request as ExpressRequest } from 'express';
import { unlink } from 'fs/promises';
import { ZodSerializerDto } from 'nestjs-zod';
import { Role } from '@workspace/db';
import {
  Feature,
  RequireFeature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { RateLimit } from '@/shared/common/interceptors/rate-limit.interceptor';
import { ZodValidationPipe } from '@/shared/common/pipes/zod-validation.pipe';
import { assertAllowedFileSignature } from '@/shared/common/utils/upload.utils';
import type {
  AuthenticatedRequest,
  OcrImportCommitRequest,
} from '@workspace/types';
import {
  DPDP_NOTICE_VERSION,
  ocrImportCommitRequestSchema,
} from '@workspace/types';
import { ImportsService } from './imports.service';
import {
  OcrResultResponseDto,
  OcrImportCommitResponseDto,
} from './dto/imports.dto';
import {
  ImportsApiAccess,
  type ImportsAuthRequest,
} from './imports.controller.access';
import { ocrImageUploadOptions } from './imports.controller.upload';
import { readRequestHeaderString } from '@/shared/common/http/client-ip';

@Controller('imports')
@ImportsApiAccess()
export class ImportsOcrController {
  constructor(private readonly importsService: ImportsService) {}

  @Post('ocr/process')
  @RateLimit({ limit: 10, window: 60000 })
  @RequireFeature(Feature.OCR_BASIC)
  @UseInterceptors(FileInterceptor('file', ocrImageUploadOptions))
  @ZodSerializerDto(OcrResultResponseDto)
  async processOCR(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: ImportsAuthRequest,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    try {
      await assertAllowedFileSignature(file, ['png', 'jpeg', 'webp', 'gif']);
      return await this.importsService.processMedicalDocumentOcr(
        file.path,
        req.user?.clinicId,
      );
    } finally {
      await unlink(file.path).catch(() => {});
    }
  }

  @Post('ocr/commit')
  @RateLimit({ limit: 20, window: 60000 })
  @RequireFeature(Feature.OCR_BASIC)
  @UsePipes(new ZodValidationPipe(ocrImportCommitRequestSchema))
  @ZodSerializerDto(OcrImportCommitResponseDto)
  async commitOcrImport(
    @Body() body: OcrImportCommitRequest,
    @Request() req: AuthenticatedRequest & ExpressRequest,
  ) {
    if (!req.user.clinicId) {
      throw new BadRequestException('Clinic ID is required');
    }
    if (body.clinicId !== req.user.clinicId) {
      throw new BadRequestException('Clinic mismatch');
    }
    const isInternal = req.user.role === Role.INTERNAL;
    if (!isInternal && body.doctorId !== req.user.id) {
      throw new BadRequestException('doctorId must match the signed-in user');
    }
    if (!body.dpdpConsent || body.dpdpConsent.accepted !== true) {
      throw new BadRequestException(
        'DPDP consent is required to commit this OCR-extracted patient record',
      );
    }
    if (body.dpdpConsent.noticeVersion !== DPDP_NOTICE_VERSION) {
      throw new BadRequestException(
        'The DPDP notice has been updated. Refresh and re-collect consent before committing.',
      );
    }
    return this.importsService.commitOcrImport(body, {
      ipAddress: req.ip,
      userAgent: readRequestHeaderString(req.headers, 'user-agent'),
      createdBy: req.user.id,
      dpdpNoticeVersion: body.dpdpConsent.noticeVersion,
    });
  }
}
