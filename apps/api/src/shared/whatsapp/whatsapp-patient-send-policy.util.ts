import { PrismaService } from '@/prisma/prisma.service';
import { Feature } from '@/shared/modules/auth/auth/tier.decorator';
import {
  clinicHasFeatureForAccess,
  type ClinicFeatureAuthSnapshot,
} from '@/shared/modules/auth/utils/clinic-feature-access.util';

type WhatsAppAutomationClinicReader = Pick<PrismaService, 'clinic'>;

/**
 * Patient-facing WhatsApp automations (reminders, system templates) require
 * Essential+ and respect clinic automation opt-out when configured.
 */
export async function isClinicWhatsAppAutomationSendingAllowed(
  prisma: WhatsAppAutomationClinicReader,
  clinicId: string,
): Promise<boolean> {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: {
      tier: true,
      intelligenceAddon: true,
      features: true,
      whatsappAutomation: true,
    },
  });

  if (!clinic) {
    return false;
  }

  const snapshot: ClinicFeatureAuthSnapshot = {
    tier: clinic.tier,
    intelligenceAddon: clinic.intelligenceAddon,
    features: clinic.features,
  };

  if (!clinicHasFeatureForAccess(snapshot, Feature.WHATSAPP_MESSAGING)) {
    return false;
  }

  if (
    !clinic.whatsappAutomation ||
    typeof clinic.whatsappAutomation !== 'object'
  ) {
    return true;
  }

  const automation = clinic.whatsappAutomation as { enabled?: boolean };
  return automation.enabled !== false;
}
