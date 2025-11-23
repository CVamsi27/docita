import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('overview')
    getOverview() {
        return this.analyticsService.getOverview();
    }

    @Get('revenue')
    getRevenueTrends(
        @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
        @Query('days') days: string = '30',
    ) {
        return this.analyticsService.getRevenueTrends(period, parseInt(days));
    }

    @Get('patients')
    getPatientGrowth(@Query('days') days: string = '30') {
        return this.analyticsService.getPatientGrowth(parseInt(days));
    }

    @Get('appointments')
    getAppointmentStats() {
        return this.analyticsService.getAppointmentStats();
    }

    @Get('top-diagnoses')
    getTopDiagnoses(@Query('limit') limit: string = '10') {
        return this.analyticsService.getTopDiagnoses(parseInt(limit));
    }
}
