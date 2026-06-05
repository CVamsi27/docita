import { Module } from '@nestjs/common';
import { LabPortalAuthController } from './presentation/controllers/lab-portal-auth.controller';
import { LabPortalAuthService } from './application/services/lab-portal-auth.service';
import { AuthModule } from '@/shared/modules/auth/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [LabPortalAuthController],
  providers: [LabPortalAuthService],
})
export class LabPortalModule {}
