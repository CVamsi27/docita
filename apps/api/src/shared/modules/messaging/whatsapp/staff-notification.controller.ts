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
import { StaffNotificationService } from './staff-notification.service';
import { RequestWithUser } from '@/common/types/common.types';

@Controller('staff-notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffNotificationController {
  constructor(private readonly notificationService: StaffNotificationService) {}

  @Get()
  async getNotifications(
    @Req() req: RequestWithUser,
    @Query('limit') limit?: number,
  ) {
    return this.notificationService.getUnreadNotifications(req.user!.id, limit);
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
