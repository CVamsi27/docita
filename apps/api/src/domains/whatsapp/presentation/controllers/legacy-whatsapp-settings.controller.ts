import {
  Body,
  Controller,
  Get,
  Inject,
  Put,
  Req,
  UsePipes,
} from '@nestjs/common';
import { Request } from 'express';
import { updateWhatsAppSettingsRequestSchema } from '@workspace/types';
import { ZodValidationPipe } from '@/shared/common/pipes/zod-validation.pipe';
import {
  WHATSAPP_PERSISTENCE_PORT,
  type WhatsappPersistencePort,
} from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import { LegacyWhatsappClinicAccess } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-clinic.access';
import { requireClinicId } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-clinic.helpers';

@Controller('whatsapp')
@LegacyWhatsappClinicAccess()
export class LegacyWhatsappSettingsController {
  constructor(
    @Inject(WHATSAPP_PERSISTENCE_PORT)
    private readonly persistence: WhatsappPersistencePort,
  ) {}

  @Get('settings')
  async getSettings(@Req() req: Request) {
    const clinicId = requireClinicId(req);
    const clinic = await this.persistence.clinic.findUnique({
      where: { id: clinicId },
      select: { settings: true },
    });
    const settings =
      clinic?.settings && typeof clinic.settings === 'object'
        ? Object.fromEntries(Object.entries(clinic.settings))
        : {};

    return {
      appointmentReminders: settings.whatsappAppointmentReminders !== false,
      followUpMessages: settings.whatsappFollowUpMessages === true,
      birthdayWishes: settings.whatsappBirthdayWishes === true,
      medicineReminders: settings.whatsappMedicineReminders !== false,
      labReportNotifications: settings.whatsappLabReportNotifications !== false,
      emergencyAlerts: settings.whatsappEmergencyAlerts !== false,
    };
  }

  @UsePipes(new ZodValidationPipe(updateWhatsAppSettingsRequestSchema))
  @Put('settings')
  async updateSettings(
    @Req() req: Request,
    @Body() body: Record<string, unknown>,
  ) {
    const clinicId = requireClinicId(req);
    const clinic = await this.persistence.clinic.findUnique({
      where: { id: clinicId },
      select: { settings: true },
    });
    const currentSettings =
      clinic?.settings && typeof clinic.settings === 'object'
        ? Object.fromEntries(Object.entries(clinic.settings))
        : {};

    const parsed = updateWhatsAppSettingsRequestSchema.parse(body);
    const nextSettings = {
      ...currentSettings,
      ...(parsed.appointmentReminders !== undefined
        ? { whatsappAppointmentReminders: parsed.appointmentReminders }
        : {}),
      ...(parsed.followUpMessages !== undefined
        ? { whatsappFollowUpMessages: parsed.followUpMessages }
        : {}),
      ...(parsed.birthdayWishes !== undefined
        ? { whatsappBirthdayWishes: parsed.birthdayWishes }
        : {}),
      ...(parsed.medicineReminders !== undefined
        ? { whatsappMedicineReminders: parsed.medicineReminders }
        : {}),
      ...(parsed.labReportNotifications !== undefined
        ? { whatsappLabReportNotifications: parsed.labReportNotifications }
        : {}),
      ...(parsed.emergencyAlerts !== undefined
        ? { whatsappEmergencyAlerts: parsed.emergencyAlerts }
        : {}),
    };

    await this.persistence.clinic.update({
      where: { id: clinicId },
      data: { settings: nextSettings },
    });

    return { success: true };
  }
}
