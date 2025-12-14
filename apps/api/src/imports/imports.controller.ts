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
import { AIService } from '../modules/ai/ai.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequireFeature, Feature } from '../auth/tier.decorator';

interface AuthRequest {
  user: {
    clinicId: string;
  };
}

const pendingImports = new Map<
  string,
  { filePath: string; expiresAt: number }
>();

@Controller('imports')
@UseGuards(JwtAuthGuard, TierGuard)
export class ImportsController {
  constructor(
    private readonly importsService: ImportsService,
    private readonly aiService: AIService,
  ) {}

  @Get('fields/patients')
  @RequireFeature(Feature.EXCEL_IMPORT)
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
      storage: diskStorage({
        destination: './uploads/temp',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(xlsx|xls|csv)$/)) {
          return cb(
            new BadRequestException(
              'Only .xlsx, .xls and .csv files are allowed!',
            ),
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
  previewImport(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const preview = this.importsService.previewImport(file.path);

    const sessionId = Array(16)
      .fill(null)
      .map(() => Math.round(Math.random() * 16).toString(16))
      .join('');

    pendingImports.set(sessionId, {
      filePath: file.path,
      expiresAt: Date.now() + 30 * 60 * 1000,
    });

    this.cleanupExpiredSessions();

    return {
      sessionId,
      ...preview,
    };
  }

  @Post('patients/:sessionId')
  @RequireFeature(Feature.EXCEL_IMPORT)
  async importPatients(
    @Param('sessionId') sessionId: string,
    @Body() body: { columnMapping?: Record<string, string> },
    @Request() req: AuthRequest,
  ) {
    const session = pendingImports.get(sessionId);

    if (!session) {
      throw new BadRequestException(
        'Import session not found or expired. Please upload the file again.',
      );
    }

    if (session.expiresAt < Date.now()) {
      pendingImports.delete(sessionId);
      throw new BadRequestException(
        'Import session expired. Please upload the file again.',
      );
    }

    pendingImports.delete(sessionId);

    return this.importsService.processPatientImport(
      session.filePath,
      req.user.clinicId,
      body.columnMapping,
    );
  }

  @Post('patients')
  @RequireFeature(Feature.EXCEL_IMPORT)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/temp',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(xlsx|xls|csv)$/)) {
          return cb(
            new BadRequestException(
              'Only .xlsx, .xls and .csv files are allowed!',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
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
  @RequireFeature(Feature.OCR_BASIC)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/temp',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
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
  async processOCR(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthRequest,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Use basic OCR (no AI)
    return this.importsService.extractFromMedicalDocumentBasic(file.path);
  }

  private cleanupExpiredSessions() {
    const now = Date.now();
    for (const [sessionId, session] of pendingImports.entries()) {
      if (session.expiresAt < now) {
        pendingImports.delete(sessionId);
      }
    }
  }
}
