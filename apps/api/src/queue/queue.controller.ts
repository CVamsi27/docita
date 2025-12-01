import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { QueueService } from './queue.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequireFeature, Feature } from '../auth/tier.decorator';

interface AuthRequest {
  user: {
    clinicId: string;
    userId: string;
  };
}

interface CreateQueueTokenDto {
  patientId: string;
  appointmentId?: string;
  doctorId?: string;
  priority?: number;
  notes?: string;
}

interface UpdateQueueTokenDto {
  status?: string;
  priority?: number;
  notes?: string;
}

interface UpdateQueueSettingsDto {
  queueBufferMinutes?: number;
  useDoctorQueues?: boolean;
  lateArrivalGraceMinutes?: number;
  avgConsultationMinutes?: number;
}

@Controller('queue')
@UseGuards(JwtAuthGuard, TierGuard)
@RequireFeature(Feature.QUEUE_MANAGEMENT)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  /**
   * Get unified view of today's patients (appointments + queue)
   * Combines pending appointments, checked-in patients, and walk-ins
   */
  @Get('today')
  getTodaysPatients(
    @Request() req: AuthRequest,
    @Query('doctorId') doctorId?: string,
  ) {
    return this.queueService.getTodaysPatients(req.user.clinicId, doctorId);
  }

  /**
   * Get queue settings for the clinic
   */
  @Get('settings')
  getQueueSettings(@Request() req: AuthRequest) {
    return this.queueService.getQueueSettings(req.user.clinicId);
  }

  /**
   * Update queue settings for the clinic
   */
  @Patch('settings')
  updateQueueSettings(
    @Request() req: AuthRequest,
    @Body() updateDto: UpdateQueueSettingsDto,
  ) {
    return this.queueService.updateQueueSettings(req.user.clinicId, updateDto);
  }

  /**
   * Get all queue tokens with optional doctor filter
   */
  @Get()
  findAll(@Request() req: AuthRequest, @Query('doctorId') doctorId?: string) {
    return this.queueService.findAllWithPatients(req.user.clinicId, doctorId);
  }

  /**
   * Get queue statistics
   */
  @Get('stats')
  getStats(@Request() req: AuthRequest, @Query('doctorId') doctorId?: string) {
    return this.queueService.getStats(req.user.clinicId, doctorId);
  }

  /**
   * Get estimated wait time for a specific token
   */
  @Get(':id/wait-time')
  getWaitTime(@Param('id') id: string) {
    return this.queueService.getEstimatedWaitTime(id);
  }

  /**
   * Get a single queue token
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.queueService.findOne(id);
  }

  /**
   * Create a walk-in queue token
   */
  @Post()
  create(@Request() req: AuthRequest, @Body() createDto: CreateQueueTokenDto) {
    return this.queueService.create(req.user.clinicId, createDto);
  }

  /**
   * Check-in a scheduled appointment to the queue
   */
  @Post('check-in/:appointmentId')
  checkInAppointment(
    @Request() req: AuthRequest,
    @Param('appointmentId') appointmentId: string,
  ) {
    return this.queueService.checkInAppointment(
      req.user.clinicId,
      appointmentId,
    );
  }

  /**
   * Call the next patient in queue
   * If useDoctorQueues is enabled, calls next for the current user's queue
   */
  @Post('call-next')
  callNext(@Request() req: AuthRequest, @Query('doctorId') doctorId?: string) {
    return this.queueService.callNext(req.user.clinicId, doctorId);
  }

  /**
   * Update a queue token (status, priority, notes)
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateQueueTokenDto) {
    return this.queueService.update(id, updateDto);
  }
}
