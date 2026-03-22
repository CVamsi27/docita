import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { QueueService } from '@/domains/appointments/application/services/queue.service';
import { RequestWithUser } from '@/common/types/common.types';

@ApiTags('Queue')
@Controller('queue')
@UseGuards(TierGuard)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get()
  @ApiOperation({
    summary: 'Get active queue (WAITING + IN_PROGRESS) for today',
  })
  getQueue(
    @Request() req: RequestWithUser,
    @Query('doctorId') doctorId?: string,
    @Query('search') search?: string,
  ) {
    return this.queueService.getQueue(req.user!.clinicId!, doctorId, search);
  }

  @Get('today')
  @ApiOperation({ summary: 'Get full queue for today with stats' })
  getTodayQueue(
    @Request() req: RequestWithUser,
    @Query('doctorId') doctorId?: string,
    @Query('search') search?: string,
  ) {
    return this.queueService.getTodayQueue(
      req.user!.clinicId!,
      doctorId,
      search,
    );
  }

  @Post('check-in/:appointmentId')
  @ApiOperation({ summary: 'Check in a patient by appointment ID' })
  checkIn(
    @Request() req: RequestWithUser,
    @Param('appointmentId') appointmentId: string,
  ) {
    return this.queueService.checkIn(req.user!.clinicId!, appointmentId);
  }

  @Post('call/:queueId')
  @ApiOperation({ summary: 'Call a patient (set IN_PROGRESS)' })
  callPatient(
    @Request() req: RequestWithUser,
    @Param('queueId') queueId: string,
  ) {
    return this.queueService.callPatient(req.user!.clinicId!, queueId);
  }

  @Post('complete/:queueId')
  @ApiOperation({ summary: 'Mark a patient as completed' })
  completePatient(
    @Request() req: RequestWithUser,
    @Param('queueId') queueId: string,
  ) {
    return this.queueService.completePatient(req.user!.clinicId!, queueId);
  }

  @Post('reset')
  @ApiOperation({
    summary: 'Reset queue (cancel all WAITING and IN_PROGRESS tokens)',
  })
  resetQueue(@Request() req: RequestWithUser) {
    return this.queueService.resetQueue(req.user!.clinicId!);
  }
}
