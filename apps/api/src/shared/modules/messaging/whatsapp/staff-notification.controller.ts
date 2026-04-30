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
import { StaffNotificationService } from './staff-notification.service';
import { RequestWithUser } from '@/common/types/common.types';
import { APP_ACCESS_TARGETS } from '@workspace/types';
import {
  getDbRolesForTarget,
  requireFeatureForTarget,
} from '@/shared/modules/auth/auth/access-matrix.util';
import {
  requireClinicId,
  requireUserId,
} from '@/common/utils/request-context.utils';

@Controller('staff-notifications')
@UseGuards(JwtAuthGuard, RolesGuard, TierGuard)
@RequireFeature(requireFeatureForTarget(APP_ACCESS_TARGETS.API_WHATSAPP))
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_WHATSAPP))
export class StaffNotificationController {
  constructor(private readonly notificationService: StaffNotificationService) {}

  @Get()
  async getNotifications(
    @Req() req: RequestWithUser,
    @Query('limit') limit?: number,
  ) {
    return this.notificationService.getUnreadNotifications(
      requireUserId(req),
      limit,
    );
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: RequestWithUser) {
    const count = await this.notificationService.getUnreadCount(
      requireUserId(req),
    );
    return { count };
  }

  @Patch('mark-read/:id')
  async markRead(@Req() req: RequestWithUser, @Param('id') id: string) {
    await this.notificationService.markNotificationRead(id, requireUserId(req));
    return { success: true };
  }

  @Delete('delete/:id')
  async deleteNotification(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    await this.notificationService.deleteNotification(id, requireUserId(req));
    return { success: true };
  }

  @Delete('delete-all')
  async deleteAllNotifications(@Req() req: RequestWithUser) {
    await this.notificationService.deleteAllNotifications(
      requireUserId(req),
      requireClinicId(req),
    );
    return { success: true };
  }
}
