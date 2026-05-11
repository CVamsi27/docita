import type { Request as ExpressRequest } from 'express';
import {
  Controller,
  Post,
  Get,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Request,
  Param,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportsService, PATIENT_FIELD_MAPPINGS } from './imports.service';
import { ImportSessionService } from './import-session.service';
import { extname } from 'path';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import {
  RequireFeature,
  Feature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { RateLimit } from '@/common/interceptors/rate-limit.interceptor';
import {
  ImportPatientFieldsResponseDto,
  ImportPreviewResponseDto,
  ImportResultResponseDto,
  OcrResultResponseDto,
  ColumnMappingRequestDto,
  OcrImportCommitResponseDto,
} from './dto/imports.dto';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import type {
  AuthenticatedRequest,
  OcrImportCommitRequest,
} from '@workspace/types';
import {
  DPDP_NOTICE_VERSION,
  ocrImportCommitRequestSchema,
} from '@workspace/types';
import { ZodSerializerDto } from 'nestjs-zod';
import { createTempDiskStorage } from '@/common/utils/upload.utils';
import { unlink } from 'fs/promises';

interface AuthRequest extends ExpressRequest {
  user: {
    id: string;
    clinicId: string;
    role: string;
  };
}

function assertDpdpAttestation(value: unknown): {
  confirmedByOperator: true;
  noticeVersion: string;
} {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { confirmedByOperator?: unknown }).confirmedByOperator !== true ||
    typeof (value as { noticeVersion?: unknown }).noticeVersion !== 'string'
  ) {
    throw new BadRequestException(
      'DPDP consent attestation is required when importing patients',
    );
  }
  const attestation = value as {
    confirmedByOperator: true;
    noticeVersion: string;
  };
  if (attestation.noticeVersion !== DPDP_NOTICE_VERSION) {
    throw new BadRequestException(
      'The DPDP notice has been updated. Reload and re-confirm the attestation.',
    );
  }
  return attestation;
}

const ALLOWED_IMPORT_EXTENSIONS = new Set(['.xlsx', '.csv']);

function hasSupportedImportExtension(fileName: string): boolean {
  return ALLOWED_IMPORT_EXTENSIONS.has(extname(fileName).toLowerCase());
}

@Controller('imports')
@Roles(Role.ADMIN, Role.ADMIN_DOCTOR, Role.INTERNAL)
@UseGuards(TierGuard)
export class ImportsController {
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
  @UseInterceptors(
    FileInterceptor('file', {
      storage: createTempDiskStorage(),
      fileFilter: (_req, file, cb) => {
        if (!hasSupportedImportExtension(file.originalname)) {
          return cb(
            new BadRequestException('Only .xlsx and .csv files are allowed!'),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1,
      },
    }),
  )
  @ZodSerializerDto(ImportPreviewResponseDto)
  async previewImport(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    try {
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
    @Request() req: AuthRequest,
  ) {
    const attestation = assertDpdpAttestation(dto.dpdpAttestation);
    const session = this.sessionService.getSession(sessionId);

    const result = await this.importsService.processPatientImport(
      session.filePath,
      req.user.clinicId,
      dto.columnMapping,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
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
  @UseInterceptors(
    FileInterceptor('file', {
      storage: createTempDiskStorage(),
      fileFilter: (_req, file, cb) => {
        if (!hasSupportedImportExtension(file.originalname)) {
          return cb(
            new BadRequestException('Only .xlsx and .csv files are allowed!'),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1,
      },
    }),
  )
  @ZodSerializerDto(ImportResultResponseDto)
  async importPatientsDirectly(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { dpdpAttestation?: string },
    @Request() req: AuthRequest,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
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
      return await this.importsService.processPatientImport(
        file.path,
        req.user.clinicId,
        undefined,
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] as string | undefined,
          createdBy: req.user.id,
          dpdpNoticeVersion: attestation.noticeVersion,
        },
      );
    } finally {
      await unlink(file.path).catch(() => {});
    }
  }

  @Post('ocr/process')
  @RateLimit({ limit: 10, window: 60000 })
  @RequireFeature(Feature.OCR_BASIC)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: createTempDiskStorage(),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/image\/(jpeg|jpg|png|gif|webp)/)) {
          return cb(
            new BadRequestException('Only image files are allowed!'),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  @ZodSerializerDto(OcrResultResponseDto)
  async processOCR(
    @UploadedFile() file: Express.Multer.File,
    @Request() _req: AuthRequest,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    try {
      return await this.importsService.processMedicalDocumentOcr(
        file.path,
        _req.user?.clinicId,
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
      userAgent: req.headers['user-agent'] as string | undefined,
      createdBy: req.user.id,
      dpdpNoticeVersion: body.dpdpConsent.noticeVersion,
    });
  }
}
