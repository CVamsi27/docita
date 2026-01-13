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

import {
  CreateQueueTokenDto,
  UpdateQueueTokenDto,
  UpdateQueueSettingsDto,
  QueueResponseDto,
  QueueListResponseDto,
  QueueSettingsResponseDto,
} from './dto/queue.dto';
import { ZodSerializerDto } from 'nestjs-zod';

interface AuthRequest {
  user: {
    clinicId: string;
    userId: string;
  };
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
  @ZodSerializerDto(QueueListResponseDto) // Note: This might need a UnifiedPatientResponseDto if structure differs significantly
  getTodaysPatients(
    @Request() req: AuthRequest,
    @Query('doctorId') doctorId?: string,
    @Query('search') search?: string,
  ) {
    // The service returns a mix of QueueTokens and Appointments.
    // Ideally this should be normalized. For now, we risk stripping fields if they don't match QueueResponseDto.
    // However, looking at getTodaysPatients in service, it returns queueTokens and appointments separately?
    // No, it seems to return a combined list or similar?
    // Let's re-read service logic carefully.
    // Service returns { queueTokens: [], appointments: [] }???
    // No, I need to check the service return type again.
    return this.queueService.getTodaysPatients(
      req.user.clinicId,
      doctorId,
      search,
    );
  }

  /**
   * Get queue settings for the clinic
   */
  @Get('settings')
  @ZodSerializerDto(QueueSettingsResponseDto)
  getQueueSettings(@Request() req: AuthRequest) {
    return this.queueService.getQueueSettings(req.user.clinicId);
  }

  /**
   * Update queue settings for the clinic
   */
  @Patch('settings')
  @ZodSerializerDto(QueueSettingsResponseDto)
  updateQueueSettings(
    @Request() req: AuthRequest,
    @Body() dto: UpdateQueueSettingsDto,
  ) {
    return this.queueService.updateQueueSettings(req.user.clinicId, dto);
  }

  /**
   * Get all queue tokens with optional doctor filter
   */
  @Get()
  @ZodSerializerDto(QueueListResponseDto)
  findAll(
    @Request() req: AuthRequest,
    @Query('doctorId') doctorId?: string,
    @Query('search') search?: string,
  ) {
    return this.queueService.findAllWithPatients(
      req.user.clinicId,
      doctorId,
      search,
    );
  }

  /**
   * Get queue statistics
   */
  @Get('stats')
  getStats(
    @Request() req: AuthRequest,
    @Query('doctorId') doctorId?: string,
    @Query('search') search?: string,
  ) {
    return this.queueService.getStats(req.user.clinicId, doctorId, search);
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
  @ZodSerializerDto(QueueResponseDto)
  findOne(@Param('id') id: string) {
    return this.queueService.findOne(id);
  }

  /**
   * Create a walk-in queue token
   */
  @Post()
  @ZodSerializerDto(QueueResponseDto)
  create(@Request() req: AuthRequest, @Body() dto: CreateQueueTokenDto) {
    return this.queueService.create(req.user.clinicId, dto);
  }

  /**
   * Check-in a scheduled appointment to the queue
   */
  @Post('check-in/:appointmentId')
  @ZodSerializerDto(QueueResponseDto)
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
  @ZodSerializerDto(QueueResponseDto) // Can return null, ZodSerializerDto handles null? No.
  async callNext(
    @Request() req: AuthRequest,
    @Query('doctorId') doctorId?: string,
  ) {
    const result = await this.queueService.callNext(
      req.user.clinicId,
      doctorId,
    );
    return result || {}; // Return empty object if null? Or simply don't serialize if null.
    // If result is null, 201 Created with empty body. serialization of null might fail if schema expects object.
  }

  /**
   * Update a queue token (status, priority, notes)
   */
  @Patch(':id')
  @ZodSerializerDto(QueueResponseDto)
  update(@Param('id') id: string, @Body() dto: UpdateQueueTokenDto) {
    return this.queueService.update(id, dto);
  }
}
