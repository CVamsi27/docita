import { Controller, Get, Put, Post, Body, Param, Query } from '@nestjs/common';
import { RemindersService } from './reminders.service';

@Controller('reminders')
export class RemindersController {
    constructor(private readonly remindersService: RemindersService) { }

    @Get('settings')
    getSettings() {
        return this.remindersService.getSettings();
    }

    @Put('settings')
    updateSettings(@Body() data: any) {
        return this.remindersService.updateSettings(data);
    }

    @Get('history')
    getReminderHistory(@Query('limit') limit: string = '50') {
        return this.remindersService.getReminderHistory(parseInt(limit));
    }

    @Post('send/:appointmentId')
    sendManualReminder(
        @Param('appointmentId') appointmentId: string,
        @Body('type') type: 'email' | 'sms',
    ) {
        return this.remindersService.sendManualReminder(appointmentId, type);
    }
}
