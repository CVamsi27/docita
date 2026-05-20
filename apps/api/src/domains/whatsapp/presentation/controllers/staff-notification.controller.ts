import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/shared/modules/auth/auth/jwt-auth.guard';
import { RolesGuard } from '@/shared/modules/auth/auth/roles.guard';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { RequireFeature } from '@/shared/modules/auth/auth/tier.decorator';
import { StaffNotificationService } from '@/domains/whatsapp/application/services/staff-notification.service';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { APP_ACCESS_TARGETS } from '@workspace/types';
import {
  getDbRolesForTarget,
  requireFeatureForTarget,
} from '@/shared/modules/auth/auth/access-matrix.util';

@Controller('staff-notifications')
@UseGuards(JwtAuthGuard, RolesGuard, TierGuard)
@RequireFeature(
  requireFeatureForTarget(APP_ACCESS_TARGETS.API_STAFF_NOTIFICATIONS),
)
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_STAFF_NOTIFICATIONS))
export class StaffNotificationController {
  constructor(private readonly notificationService: StaffNotificationService) {}

  @Get()
  async getNotifications(
    @Req() req: RequestWithUser,
    @Query('limit') limit?: number,
  ) {
    return this.notificationService.getUnreadNotifications(req.user!.id, limit);
  }

  @Get('all')
  async getAllNotifications(
    @Req() req: RequestWithUser,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.notificationService.getAllNotifications(req.user!.id, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: RequestWithUser) {
    const count = await this.notificationService.getUnreadCount(req.user!.id);
    return { count };
  }

  @Patch('mark-read/:id')
  async markRead(@Req() req: RequestWithUser, @Param('id') id: string) {
    await this.notificationService.markNotificationRead(id, req.user!.id);
    return { success: true };
  }

  @Delete('delete/:id')
  async deleteNotification(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    await this.notificationService.deleteNotification(id, req.user!.id);
    return { success: true };
  }

  @Delete('delete-all')
  async deleteAllNotifications(@Req() req: RequestWithUser) {
    await this.notificationService.deleteAllNotifications(
      req.user!.id,
      req.user!.clinicId!,
    );
    return { success: true };
  }
}
