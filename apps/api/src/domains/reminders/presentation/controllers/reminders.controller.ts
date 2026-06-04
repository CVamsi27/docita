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
import { RemindersApiAccess } from '@/domains/reminders/presentation/controllers/reminders.controller.access';
import {
  ReminderSettingsDto,
  SendReminderDto,
  ReminderSettingsResponseDto,
  AppointmentReminderListResponseDto,
  ManualReminderResponseDto,
  UpdateReminderSettingsSchema,
  sendReminderSchema,
} from '@/domains/reminders/application/dto/reminder-settings.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '@/shared/common/pipes/zod-validation.pipe';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { requireClinicIdFromRequest } from '@/shared/modules/auth/auth/clinic-request-context';

@Controller('reminders')
@RemindersApiAccess()
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get('settings')
  @ZodSerializerDto(ReminderSettingsResponseDto)
  getSettings(@Request() req: RequestWithUser) {
    return this.remindersService.getSettings(requireClinicIdFromRequest(req));
  }

  @Put('settings')
  @ZodSerializerDto(ReminderSettingsResponseDto)
  @UsePipes(new ZodValidationPipe(UpdateReminderSettingsSchema))
  updateSettings(
    @Request() req: RequestWithUser,
    @Body() data: ReminderSettingsDto,
  ) {
    return this.remindersService.updateSettings(
      data,
      requireClinicIdFromRequest(req),
    );
  }

  @Get('history')
  @ZodSerializerDto(AppointmentReminderListResponseDto)
  getReminderHistory(
    @Request() req: RequestWithUser,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
  ) {
    return this.remindersService.getReminderHistory(
      requireClinicIdFromRequest(req),
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
      requireClinicIdFromRequest(req),
    );
  }
}
