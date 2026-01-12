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
} from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ReminderSettingsDto,
  SendReminderDto,
} from './dto/reminder-settings.dto';

@Controller('reminders')
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get('settings')
  getSettings() {
    return this.remindersService.getSettings();
  }

  @Put('settings')
  updateSettings(@Body() data: ReminderSettingsDto) {
    return this.remindersService.updateSettings(data);
  }

  @Get('history')
  getReminderHistory(
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
  ) {
    return this.remindersService.getReminderHistory(limit);
  }

  @Post('send/:appointmentId')
  sendManualReminder(
    @Param('appointmentId') appointmentId: string,
    @Body() body: SendReminderDto,
  ) {
    return this.remindersService.sendManualReminder(appointmentId, body.type);
  }
}
