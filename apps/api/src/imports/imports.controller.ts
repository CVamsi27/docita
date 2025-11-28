import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportsService } from './imports.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequireTier, Tier } from '../auth/tier.decorator';

@Controller('imports')
@UseGuards(JwtAuthGuard, TierGuard)
export class ImportsController {
  constructor(private readonly importsService: ImportsService) { }

  @Post('patients')
  @RequireTier(Tier.FREE) // Excel import is available on Free tier
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
        if (!file.originalname.match(/\.(xlsx|csv)$/)) {
          return cb(
            new BadRequestException('Only .xlsx and .csv files are allowed!'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async importPatients(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.importsService.processPatientImport(file.path);
  }
}
