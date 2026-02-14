import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  UseGuards,
  Request,
  Query,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AuthenticatedRequest } from '@workspace/types';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@workspace/db';
import { UploadDocumentDto, UploadDocumentSchema } from './dto/upload-document.dto';
import {
  DocumentResponseDto,
  DocumentListResponseDto,
} from './dto/documents.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('documents')
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ZodSerializerDto(DocumentListResponseDto)
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('patientId') patientId?: string,
  ) {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      throw new BadRequestException('Clinic ID not found in request');
    }
    return this.documentsService.findAll(clinicId, {
      search,
      type,
      patientId,
    });
  }

  @Get(':id')
  @ZodSerializerDto(DocumentResponseDto)
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      throw new BadRequestException('Clinic ID not found in request');
    }
    return this.documentsService.findOne(id, clinicId);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/documents',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  )
  @ZodSerializerDto(DocumentResponseDto)
  @UsePipes(new ZodValidationPipe(UploadDocumentSchema))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadDocumentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      throw new BadRequestException('Clinic ID not found in request');
    }
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.documentsService.create(
      {
        patientId: body.patientId,
        type: body.type,
        fileName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        description: body.description,
      },
      clinicId,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const clinicId = req.user?.clinicId;
    if (!clinicId) {
      throw new BadRequestException('Clinic ID not found in request');
    }
    return this.documentsService.remove(id, clinicId);
  }
}
