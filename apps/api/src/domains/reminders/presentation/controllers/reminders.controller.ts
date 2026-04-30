import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards as _UseGuards,
  ParseIntPipe,
  Request,
  UsePipes,
} from '@nestjs/common';
import { RemindersService } from '@/domains/reminders/application/services/reminders.service';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import {
  ReminderSettingsDto,
  SendReminderDto,
  ReminderSettingsResponseDto,
  AppointmentReminderListResponseDto,
  ManualReminderResponseDto,
  UpdateReminderSettingsSchema,
  sendReminderSchema,
} from '@/domains/reminders/dto/reminder-settings.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { RequestWithUser } from '@/common/types/common.types';
import { requireClinicId } from '@/common/utils/request-context.utils';

@Controller('reminders')
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get('settings')
  @ZodSerializerDto(ReminderSettingsResponseDto)
  getSettings(@Request() req: RequestWithUser) {
    return this.remindersService.getSettings(requireClinicId(req));
  }

  @Put('settings')
  @ZodSerializerDto(ReminderSettingsResponseDto)
  @UsePipes(new ZodValidationPipe(UpdateReminderSettingsSchema))
  updateSettings(
    @Request() req: RequestWithUser,
    @Body() data: ReminderSettingsDto,
  ) {
    return this.remindersService.updateSettings(data, requireClinicId(req));
  }

  @Get('history')
  @ZodSerializerDto(AppointmentReminderListResponseDto)
  getReminderHistory(
    @Request() req: RequestWithUser,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
  ) {
    return this.remindersService.getReminderHistory(
      requireClinicId(req),
      limit,
    );
  }

  @Post('send/:appointmentId')
  @ZodSerializerDto(ManualReminderResponseDto)
  @UsePipes(new ZodValidationPipe(sendReminderSchema))
  sendManualReminder(
    @Request() req: RequestWithUser,
    @Param('appointmentId') appointmentId: string,
    @Body() body: SendReminderDto,
  ) {
    return this.remindersService.sendManualReminder(
      appointmentId,
      body.type,
      requireClinicId(req),
    );
  }
}
