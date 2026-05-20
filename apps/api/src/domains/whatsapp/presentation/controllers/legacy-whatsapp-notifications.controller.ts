import { Controller, Delete, Get, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import {
  SuccessResponseDto,
  WhatsappUnreadCountResponseDto,
  WhatsappUnreadNotificationsQueryDto,
  WhatsappUnreadNotificationsResponseDto,
} from '@/domains/whatsapp/presentation/dto/whatsapp-response.dto';
import { LegacyWhatsappClinicAccess } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-clinic.access';
import {
  requireClinicId,
  requireUserId,
} from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-clinic.helpers';

@Controller('whatsapp')
@LegacyWhatsappClinicAccess()
export class LegacyWhatsappNotificationsController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('notifications/unread-count')
  @ZodSerializerDto(WhatsappUnreadCountResponseDto)
  async getUnreadNotificationCount(@Req() req: Request) {
    const count = await this.whatsappService.getUnreadNotificationCount(
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
    return this.whatsappService.getUnreadNotifications(
      requireUserId(req),
      query?.limit,
    );
  }

  @Delete('notifications/:id')
  @ZodSerializerDto(SuccessResponseDto)
  async deleteNotification(@Req() req: Request, @Param('id') id: string) {
    await this.whatsappService.deleteNotification(id, requireUserId(req));
    return { success: true, message: 'Notification deleted' };
  }

  @Delete('notifications')
  @ZodSerializerDto(SuccessResponseDto)
  async deleteAllNotifications(@Req() req: Request) {
    const userId = requireUserId(req);
    await this.whatsappService.deleteAllNotifications(
      userId,
      requireClinicId(req),
    );
    return { success: true, message: 'All notifications deleted' };
  }
}
