import { Controller, Delete, Get, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import { StaffNotificationService } from '@/domains/whatsapp/application/services/staff-notification.service';
import {
  SuccessResponseDto,
  WhatsappUnreadCountResponseDto,
  WhatsappUnreadNotificationsQueryDto,
  WhatsappUnreadNotificationsResponseDto,
} from '@/domains/whatsapp/presentation/dto/whatsapp-response.dto';
import { LegacyWhatsappClinicAccess } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-clinic.access';
import { requireClinicId } from '@/domains/whatsapp/presentation/controllers/require-clinic-id';
import { requireUserId } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-clinic.helpers';

@Controller('whatsapp')
@LegacyWhatsappClinicAccess()
export class LegacyWhatsappNotificationsController {
  constructor(
    private readonly staffNotificationService: StaffNotificationService,
  ) {}

  @Get('notifications/unread-count')
  @ZodSerializerDto(WhatsappUnreadCountResponseDto)
  async getUnreadNotificationCount(@Req() req: Request) {
    const count = await this.staffNotificationService.getUnreadCount(
      requireUserId(req),
    );
    return { count };
  }

  @Get('notifications/unread')
  @ZodSerializerDto(WhatsappUnreadNotificationsResponseDto)
  async getUnreadNotifications(
    @Req() req: Request,
    @Query() query?: WhatsappUnreadNotificationsQueryDto,
  ) {
    return this.staffNotificationService.getUnreadNotifications(
      requireUserId(req),
      query?.limit,
    );
  }

  @Delete('notifications/:id')
  @ZodSerializerDto(SuccessResponseDto)
  async deleteNotification(@Req() req: Request, @Param('id') id: string) {
    await this.staffNotificationService.deleteNotification(
      id,
      requireUserId(req),
    );
    return { success: true, message: 'Notification deleted' };
  }

  @Delete('notifications')
  @ZodSerializerDto(SuccessResponseDto)
  async deleteAllNotifications(@Req() req: Request) {
    const userId = requireUserId(req);
    await this.staffNotificationService.deleteAllNotifications(
      userId,
      requireClinicId(req),
    );
    return { success: true, message: 'All notifications deleted' };
  }
}
