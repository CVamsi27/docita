import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Assuming auth guard exists

@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('stats')
    // @UseGuards(JwtAuthGuard)
    async getStats() {
        return this.dashboardService.getStats();
    }
}
