import { Controller, Get } from '@nestjs/common';
import { PerformanceService } from './performance.service';

@Controller('performance')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @Get('db-stats')
  async getDatabaseStats() {
    return this.performanceService.getDatabaseStats();
  }

  @Get('metrics')
  getMetrics() {
    return this.performanceService.getMetrics();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
