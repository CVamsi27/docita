import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('session')
  async createSession() {
    return this.uploadsService.createSession();
  }

  @Get('session/:id')
  async getSession(@Param('id') id: string) {
    return this.uploadsService.getSession(id);
  }

  @Post('session/:id')
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
    }),
  )
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    // In a real app, we would upload to S3/Cloudinary here and get a URL.
    // For now, we'll simulate a URL or serve it statically if we enabled static serving.
    // We'll just return the path for now.

    return this.uploadsService.updateSession(id, file.path);
  }
}
