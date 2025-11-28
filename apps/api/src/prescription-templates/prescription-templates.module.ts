import { Module } from '@nestjs/common';
import { PrescriptionTemplatesController } from './prescription-templates.controller';
import { PrescriptionTemplatesService } from './prescription-templates.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [PrescriptionTemplatesController],
    providers: [PrescriptionTemplatesService],
    exports: [PrescriptionTemplatesService],
})
export class PrescriptionTemplatesModule { }
