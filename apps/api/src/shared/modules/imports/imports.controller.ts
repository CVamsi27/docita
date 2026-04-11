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
} from './dto/imports.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { createTempDiskStorage } from '@/common/utils/upload.utils';

interface AuthRequest {
  user: {
    clinicId: string;
  };
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

    const preview = await this.importsService.previewImport(file.path);
    const sessionId = this.sessionService.createSession(file.path);

    return {
      sessionId,
      ...preview,
    };
  }

  @Post('patients/:sessionId')
  @RequireFeature(Feature.EXCEL_IMPORT)
  @ZodSerializerDto(ImportResultResponseDto)
  async importPatients(
    @Param('sessionId') sessionId: string,
    @Body() dto: ColumnMappingRequestDto,
    @Request() req: AuthRequest,
  ) {
    const session = this.sessionService.getSession(sessionId);

    const result = await this.importsService.processPatientImport(
      session.filePath,
      req.user.clinicId,
      dto.columnMapping,
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
    @Request() req: AuthRequest,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.importsService.processPatientImport(
      file.path,
      req.user.clinicId,
    );
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

    return await this.importsService.extractFromMedicalDocumentBasic(
      file.path,
      _req.user?.clinicId,
    );
  }
}
