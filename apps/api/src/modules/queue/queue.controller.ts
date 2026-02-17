import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Request,
} from '@nestjs/common';
import { QueueService } from './queue.service';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@workspace/db';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

interface AuthRequest {
  user: {
    id: string;
    clinicId: string;
    role: string;
  };
}

@ApiTags('queue')
@Controller('queue')
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get()
  @ApiOperation({ summary: 'Get today\'s queue tokens' })
  findAll(
    @Request() req: AuthRequest,
    @Query('doctorId') doctorId?: string,
    @Query('search') search?: string,
  ) {
    return this.queueService.findAll(req.user.clinicId, { doctorId, search });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get queue statistics for today' })
  getStats(
    @Request() req: AuthRequest,
    @Query('doctorId') doctorId?: string,
    @Query('search') search?: string,
  ) {
    return this.queueService.getStats(req.user.clinicId, { doctorId, search });
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get queue settings' })
  getSettings(@Request() req: AuthRequest) {
    return this.queueService.getSettings(req.user.clinicId);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update queue settings' })
  @Roles(Role.ADMIN, Role.ADMIN_DOCTOR)
  updateSettings(
    @Request() req: AuthRequest,
    @Body()
    body: {
      queueBufferMinutes?: number;
      useDoctorQueues?: boolean;
      lateArrivalGraceMinutes?: number;
      avgConsultationMinutes?: number;
    },
  ) {
    return this.queueService.updateSettings(req.user.clinicId, body);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new queue token' })
  createToken(
    @Request() req: AuthRequest,
    @Body()
    body: {
      patientId: string;
      appointmentId?: string;
      doctorId?: string;
      priority?: number;
      notes?: string;
    },
  ) {
    return this.queueService.createToken(req.user.clinicId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a queue token' })
  updateToken(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: { status?: string; priority?: number; notes?: string },
  ) {
    return this.queueService.updateToken(id, req.user.clinicId, body);
  }

  @Post('check-in/:id')
  @ApiOperation({ summary: 'Check in an appointment into the queue' })
  checkIn(@Request() req: AuthRequest, @Param('id') appointmentId: string) {
    return this.queueService.checkIn(appointmentId, req.user.clinicId);
  }

  @Post('walk-in')
  @ApiOperation({ summary: 'Create a walk-in queue token' })
  createWalkIn(
    @Request() req: AuthRequest,
    @Body()
    body: { patientName: string; phoneNumber: string; reason?: string },
  ) {
    return this.queueService.createWalkIn(req.user.clinicId, body);
  }

  @Post('call-next')
  @ApiOperation({ summary: 'Call the next patient in queue' })
  callNext(
    @Request() req: AuthRequest,
    @Query('doctorId') doctorId?: string,
  ) {
    return this.queueService.callNext(req.user.clinicId, doctorId);
  }

  @Get(':id/wait-time')
  @ApiOperation({ summary: 'Get estimated wait time for a token' })
  getEstimatedWaitTime(
    @Request() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.queueService.getEstimatedWaitTime(id, req.user.clinicId);
  }
}
