import { WhatsappLogStatus } from '@workspace/db';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import type { SendMessageResult } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import type { WhatsappPersistencePort } from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import { ClinicSettingsSchema } from '@/domains/clinics/presentation/schemas/settings.schema';

export function resolveAppointmentMapsLink(settings: unknown): string {
  const settingsParsed = ClinicSettingsSchema.safeParse(settings);
  const mapsLocation = settingsParsed.success
    ? settingsParsed.data.mapsLocation
    : undefined;
  const customMapsLink = settingsParsed.success
    ? settingsParsed.data.mapsLink?.trim()
    : undefined;

  return (
    customMapsLink ||
    (mapsLocation
      ? `https://www.google.com/maps?q=${mapsLocation.lat},${mapsLocation.lng}`
      : '')
  );
}

export async function logOutboundPatientTemplate(
  persistence: WhatsappPersistencePort,
  params: {
    clinicId: string;
    patientId: string;
    phoneNumber: string;
    templateId: string;
    appointmentId: string;
    sendResult: SendMessageResult;
    variables: Record<string, string>;
  },
): Promise<void> {
  await persistence.whatsappLog.create({
    data: {
      clinicId: params.clinicId,
      patientId: params.patientId,
      phoneNumber: params.phoneNumber,
      message: `Sent template: ${params.templateId}`,
      type: params.templateId,
      status: WhatsappLogStatus.SENT,
      providerMessageId: params.sendResult.providerMessageId || null,
      senderMode: params.sendResult.senderMode ?? 'SHARED',
      senderPhoneNumberId: params.sendResult.senderPhoneNumberId ?? null,
      requestBody: toPrismaInputJsonValue({
        appointmentId: params.appointmentId,
        templateId: params.templateId,
        variables: params.variables,
      }),
    },
  });
}
