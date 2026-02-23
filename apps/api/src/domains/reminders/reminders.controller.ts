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
  UsePipes,
} from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { Role } from '@workspace/db';
import { Roles } from '../../shared/modules/auth/auth/roles.decorator';
import {
  ReminderSettingsDto,
  SendReminderDto,
  ReminderSettingsResponseDto,
  AppointmentReminderListResponseDto,
  ManualReminderResponseDto,
  UpdateReminderSettingsSchema,
  sendReminderSchema,
} from './dto/reminder-settings.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

interface AuthRequest {
  user: {
    clinicId: string;
  };
}

@Controller('reminders')
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get('settings')
  @ZodSerializerDto(ReminderSettingsResponseDto)
  getSettings(@Request() req: AuthRequest) {
    return this.remindersService.getSettings(req.user.clinicId);
  }

  @Put('settings')
  @ZodSerializerDto(ReminderSettingsResponseDto)
  @UsePipes(new ZodValidationPipe(UpdateReminderSettingsSchema))
  updateSettings(
    @Request() req: AuthRequest,
    @Body() data: ReminderSettingsDto,
  ) {
    return this.remindersService.updateSettings(data, req.user.clinicId);
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
  @UsePipes(new ZodValidationPipe(sendReminderSchema))
  sendManualReminder(
    @Param('appointmentId') appointmentId: string,
    @Body() body: SendReminderDto,
  ) {
    return this.remindersService.sendManualReminder(appointmentId, body.type);
  }
}
