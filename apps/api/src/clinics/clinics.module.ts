import { Module } from '@nestjs/common';
import { ClinicsController } from './clinics.controller';
import { ClinicsService } from './clinics.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [ClinicsController],
    providers: [ClinicsService],
    exports: [ClinicsService],
})
export class ClinicsModule { }
