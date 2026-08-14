import {
  Controller,
  Post,
  Get,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Request,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { unlink } from 'fs/promises';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  Feature,
  RequireFeature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { RateLimit } from '@/shared/common/interceptors/rate-limit.interceptor';
import { assertAllowedImportFileSignature } from '@/shared/common/utils/upload.utils';
import { ImportsService, PATIENT_FIELD_MAPPINGS } from './imports.service';
import { ImportSessionService } from './import-session.service';
import {
  ImportPatientFieldsResponseDto,
  ImportPreviewResponseDto,
  ImportResultResponseDto,
  ColumnMappingRequestDto,
} from './dto/imports.dto';
import {
  ImportsApiAccess,
  assertDpdpAttestation,
  type ImportsAuthRequest,
} from './imports.controller.access';
import { spreadsheetImportUploadOptions } from './imports.controller.upload';

@Controller('imports')
@ImportsApiAccess()
export class ImportsPatientsController {
  constructor(
    private readonly importsService: ImportsService,
    private readonly sessionService: ImportSessionService,
  ) {}

  @Get('fields/patients')
  @RequireFeature(Feature.EXCEL_IMPORT)
  @ZodSerializerDto(ImportPatientFieldsResponseDto)
  getPatientFields() {
    return {
      fields: Object.entries(PATIENT_FIELD_MAPPINGS).map(
        ([field, aliases]) => ({
          field,
          aliases,
          required: field === 'firstName' || field === 'phoneNumber',
        }),
      ),
    };
  }

  @Post('preview')
  @RequireFeature(Feature.EXCEL_IMPORT)
  @UseInterceptors(FileInterceptor('file', spreadsheetImportUploadOptions))
  @ZodSerializerDto(ImportPreviewResponseDto)
  async previewImport(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');

    try {
      await assertAllowedImportFileSignature(file);
      const preview = await this.importsService.previewImport(file.path);
      const sessionId = this.sessionService.createSession(file.path);
      return { sessionId, ...preview };
    } catch (error) {
      await unlink(file.path).catch(() => {});
      throw error;
    }
  }

  @Post('patients/:sessionId')
  @RequireFeature(Feature.EXCEL_IMPORT)
  @ZodSerializerDto(ImportResultResponseDto)
  async importPatients(
    @Param('sessionId') sessionId: string,
    @Body() dto: ColumnMappingRequestDto,
    @Request() req: ImportsAuthRequest,
  ) {
    const attestation = assertDpdpAttestation(dto.dpdpAttestation);
    const session = this.sessionService.getSession(sessionId);

    const result = await this.importsService.processPatientImport(
      session.filePath,
      req.user.clinicId,
      dto.columnMapping,
      {
        ipAddress: req.ip,
        userAgent:
          typeof req.headers['user-agent'] === 'string'
            ? req.headers['user-agent']
            : undefined,
        createdBy: req.user.id,
        dpdpNoticeVersion: attestation.noticeVersion,
      },
    );

    this.sessionService.deleteSession(sessionId);

    return result;
  }

  @Post('patients')
  @RateLimit({ limit: 5, window: 60000 })
  @RequireFeature(Feature.EXCEL_IMPORT)
  @UseInterceptors(FileInterceptor('file', spreadsheetImportUploadOptions))
  @ZodSerializerDto(ImportResultResponseDto)
  async importPatientsDirectly(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { dpdpAttestation?: string },
    @Request() req: ImportsAuthRequest,
  ) {
    if (!file) throw new BadRequestException('File is required');
    let parsedAttestation: unknown;
    try {
      parsedAttestation = body.dpdpAttestation
        ? JSON.parse(body.dpdpAttestation)
        : undefined;
    } catch {
      throw new BadRequestException(
        'Invalid dpdpAttestation payload (must be JSON-encoded)',
      );
    }
    const attestation = assertDpdpAttestation(parsedAttestation);
    try {
      await assertAllowedImportFileSignature(file);
      return await this.importsService.processPatientImport(
        file.path,
        req.user.clinicId,
        undefined,
        {
          ipAddress: req.ip,
          userAgent:
            typeof req.headers['user-agent'] === 'string'
              ? req.headers['user-agent']
              : undefined,
          createdBy: req.user.id,
          dpdpNoticeVersion: attestation.noticeVersion,
        },
      );
    } finally {
      await unlink(file.path).catch(() => {});
    }
  }
}
