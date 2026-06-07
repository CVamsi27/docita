import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { LeaveService } from './application/services/leave.service';
import { LeaveCommandService } from './application/services/leave-command.service';
import { LeaveQueryService } from './application/services/leave-query.service';
import { LeavePlanService } from './application/services/leave-plan.service';
import { LeaveController } from './presentation/controllers/leave.controller';
import { LeavePlanController } from './presentation/controllers/leave-plan.controller';
import { AvailabilityScheduleService } from '@/domains/doctors/application/services/availability-schedule.service';
import {
  DOCTOR_SCHEDULE_CORE_REPOSITORY_TOKEN,
  DOCTOR_SCHEDULE_REPOSITORY_TOKEN,
  DOCTOR_TIME_OFF_REPOSITORY_TOKEN,
} from '@/domains/doctors/core/repositories/doctor-schedule.repository.interface';
import { PrismaDoctorScheduleCoreRepository } from '@/domains/doctors/infrastructure/repositories/prisma-doctor-schedule-core.repository';
import { PrismaDoctorScheduleRepository } from '@/domains/doctors/infrastructure/repositories/prisma-doctor-schedule.repository';
import { PrismaDoctorTimeOffRepository } from '@/domains/doctors/infrastructure/repositories/prisma-doctor-time-off.repository';
import { LEAVE_REPOSITORY_TOKEN } from './core/repositories/leave.repository.interface';
import { PrismaLeaveRepository } from './infrastructure/repositories/prisma-leave.repository';

@Module({
  imports: [PrismaModule],
  controllers: [LeaveController, LeavePlanController],
  providers: [
    LeaveCommandService,
    LeaveQueryService,
    LeaveService,
    LeavePlanService,
// jscpd:ignore-start
    AvailabilityScheduleService,
    PrismaDoctorScheduleCoreRepository,
    PrismaDoctorTimeOffRepository,
    PrismaDoctorScheduleRepository,
    {
      provide: DOCTOR_SCHEDULE_REPOSITORY_TOKEN,
      useExisting: PrismaDoctorScheduleRepository,
    },
    {
      provide: DOCTOR_SCHEDULE_CORE_REPOSITORY_TOKEN,
      useExisting: PrismaDoctorScheduleCoreRepository,
    },
    {
      provide: DOCTOR_TIME_OFF_REPOSITORY_TOKEN,
      useExisting: PrismaDoctorTimeOffRepository,
    },
    {
// jscpd:ignore-end
      provide: LEAVE_REPOSITORY_TOKEN,
      useClass: PrismaLeaveRepository,
    },
  ],
  exports: [LeaveService, LeavePlanService],
})
export class LeaveModule {}
