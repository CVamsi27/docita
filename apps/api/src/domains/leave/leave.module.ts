import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { LeaveService } from './application/services/leave.service';
import { LeavePlanService } from './application/services/leave-plan.service';
import { LeaveController } from './presentation/controllers/leave.controller';
import { LeavePlanController } from './presentation/controllers/leave-plan.controller';
import { AvailabilityScheduleService } from '@/domains/doctors/application/services/availability-schedule.service';
import { DOCTOR_SCHEDULE_REPOSITORY_TOKEN } from '@/domains/doctors/core/repositories/doctor-schedule.repository.interface';
import { PrismaDoctorScheduleRepository } from '@/domains/doctors/infrastructure/repositories/prisma-doctor-schedule.repository';
import { LEAVE_REPOSITORY_TOKEN } from './core/repositories/leave.repository.interface';
import { PrismaLeaveRepository } from './infrastructure/repositories/prisma-leave.repository';

@Module({
  imports: [PrismaModule],
  controllers: [LeaveController, LeavePlanController],
  providers: [
    LeaveService,
    LeavePlanService,
    AvailabilityScheduleService,
    {
      provide: DOCTOR_SCHEDULE_REPOSITORY_TOKEN,
      useClass: PrismaDoctorScheduleRepository,
    },
    {
      provide: LEAVE_REPOSITORY_TOKEN,
      useClass: PrismaLeaveRepository,
    },
  ],
  exports: [LeaveService, LeavePlanService],
})
export class LeaveModule {}
