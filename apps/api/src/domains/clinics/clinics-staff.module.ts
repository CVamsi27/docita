import { Module, forwardRef } from '@nestjs/common';
import { JoinRequestsController } from './presentation/controllers/join-requests.controller';
import { StaffManagementService } from './application/services/staff-management.service';
import { StaffInviteService } from './application/services/staff-invite.service';
import { JoinRequestService } from './application/services/join-request.service';
import { JoinRequestCommandService } from './application/services/join-request-command.service';
import { JoinRequestQueryService } from './application/services/join-request-query.service';
import { PrismaJoinRequestRepository } from './infrastructure/repositories/prisma-join-request.repository';
import { JOIN_REQUEST_REPOSITORY_TOKEN } from './core/repositories/join-request.repository.interface';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthGuardsModule } from '@/shared/modules/auth/auth/auth-guards.module';
import { UsersModule } from '@/domains/users/users.module';
import { MessagingModule } from '@/shared/modules/messaging/messaging.module';
import { WhatsappModule } from '@/domains/whatsapp/whatsapp-clinic.module';
import { CLINIC_PERSISTENCE_PORT } from './application/ports/clinic-persistence.port';

@Module({
  imports: [
    PrismaModule,
    AuthGuardsModule,
    forwardRef(() => UsersModule),
    MessagingModule,
    WhatsappModule,
  ],
  controllers: [JoinRequestsController],
  providers: [
    { provide: CLINIC_PERSISTENCE_PORT, useExisting: PrismaService },
    JoinRequestService,
    JoinRequestCommandService,
    JoinRequestQueryService,
    StaffManagementService,
    StaffInviteService,
    PrismaJoinRequestRepository,
    {
      provide: JOIN_REQUEST_REPOSITORY_TOKEN,
      useClass: PrismaJoinRequestRepository,
    },
  ],
  exports: [
    JoinRequestService,
    JoinRequestCommandService,
    JoinRequestQueryService,
    StaffManagementService,
    StaffInviteService,
  ],
})
export class ClinicsStaffModule {}
