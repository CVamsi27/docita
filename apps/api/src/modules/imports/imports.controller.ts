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
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequireFeature, Feature } from '../auth/tier.decorator';
import {
  ImportPatientFieldsResponseDto,
  ImportPreviewResponseDto,
  ImportResultResponseDto,
  OcrResultResponseDto,
} from './dto/imports.dto';
import { ZodSerializerDto } from 'nestjs-zod';

interface AuthRequest {
  user: {
    clinicId: string;
  };
}

@Controller('imports')
@UseGuards(JwtAuthGuard, TierGuard)
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
  @ZodSerializerDto(ImportPreviewResponseDto)
  previewImport(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const preview = this.importsService.previewImport(file.path);
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
    @Body() body: { columnMapping?: Record<string, string> },
    @Request() req: AuthRequest,
  ) {
    const session = this.sessionService.getSession(sessionId);

    // If getSession returns, it's valid and not expired
    const result = await this.importsService.processPatientImport(
      session.filePath,
      req.user.clinicId,
      body.columnMapping,
    );

    // Cleanup session after successful import
    this.sessionService.deleteSession(sessionId);

    return result;
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
  @ZodSerializerDto(OcrResultResponseDto)
  async processOCR(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthRequest,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Use basic OCR (no AI)
    return await this.importsService.extractFromMedicalDocumentBasic(file.path);
  }
}
