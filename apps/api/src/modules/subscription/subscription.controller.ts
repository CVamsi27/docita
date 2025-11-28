import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { SubscriptionService } from './subscription.service';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  /**
   * Get complete tier configuration - PUBLIC endpoint
   * This is the single source of truth for all tier-related data
   */
  @Get('config')
  getTierConfig() {
    return this.subscriptionService.getTierConfig();
  }

  /**
   * Get current clinic's subscription details
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getSubscription(@Request() req: any) {
    return this.subscriptionService.getSubscription(req.user.clinicId);
  }

  /**
   * Get all available tiers
   */
  @Get('tiers')
  getAllTiers() {
    return this.subscriptionService.getAllTiers();
  }

  /**
   * Get intelligence addon info
   */
  @Get('intelligence')
  getIntelligenceInfo() {
    return this.subscriptionService.getIntelligenceAddonInfo();
  }

  /**
   * Upgrade tier (admin only)
   */
  @Post('upgrade')
  @Roles('ADMIN', 'SUPER_ADMIN', 'ADMIN_DOCTOR')
  async upgradeTier(
    @Request() req: any,
    @Body() body: { tier: string },
  ) {
    return this.subscriptionService.upgradeTier(req.user.clinicId, body.tier);
  }

  /**
   * Enable/disable intelligence addon (admin only)
   */
  @Put('intelligence')
  @Roles('ADMIN', 'SUPER_ADMIN', 'ADMIN_DOCTOR')
  async setIntelligence(
    @Request() req: any,
    @Body() body: { enabled: boolean },
  ) {
    return this.subscriptionService.setIntelligenceAddon(
      req.user.clinicId,
      body.enabled,
    );
  }

  /**
   * Start a trial (super admin only)
   */
  @Post(':clinicId/trial')
  @Roles('SUPER_ADMIN')
  async startTrial(
    @Param('clinicId') clinicId: string,
    @Body() body: { tier: string; days?: number },
  ) {
    return this.subscriptionService.startTrial(
      clinicId,
      body.tier,
      body.days || 14,
    );
  }

  /**
   * Set feature overrides (super admin only)
   */
  @Put(':clinicId/features')
  @Roles('SUPER_ADMIN')
  async setFeatureOverrides(
    @Param('clinicId') clinicId: string,
    @Body() body: { features: Record<string, boolean> },
  ) {
    return this.subscriptionService.setFeatureOverrides(
      clinicId,
      body.features,
    );
  }
}
