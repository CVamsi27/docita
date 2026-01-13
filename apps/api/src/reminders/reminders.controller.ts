import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ReminderSettingsDto,
  SendReminderDto,
  ReminderSettingsResponseDto,
  AppointmentReminderListResponseDto,
  ManualReminderResponseDto,
} from './dto/reminder-settings.dto';
import { ZodSerializerDto } from 'nestjs-zod';

interface AuthRequest {
  user: {
    clinicId: string;
  };
}

@Controller('reminders')
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get('settings')
  @ZodSerializerDto(ReminderSettingsResponseDto)
  getSettings() {
    return this.remindersService.getSettings();
  }

  @Put('settings')
  @ZodSerializerDto(ReminderSettingsResponseDto)
  updateSettings(@Body() data: ReminderSettingsDto) {
    return this.remindersService.updateSettings(data);
  }

  @Get('history')
  @ZodSerializerDto(AppointmentReminderListResponseDto)
  getReminderHistory(
    @Request() req: AuthRequest,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
  ) {
    return this.remindersService.getReminderHistory(req.user.clinicId, limit);
  }

  @Post('send/:appointmentId')
  @ZodSerializerDto(ManualReminderResponseDto)
  sendManualReminder(
    @Param('appointmentId') appointmentId: string,
    @Body() body: SendReminderDto,
  ) {
    return this.remindersService.sendManualReminder(appointmentId, body.type);
  }
}
