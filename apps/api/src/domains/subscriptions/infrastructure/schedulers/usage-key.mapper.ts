import { UsageType } from '@workspace/db';

const OVERAGE_KEY_TO_USAGE_TYPE: Partial<Record<string, UsageType>> = {
  consultations: UsageType.APPOINTMENTS,
  users: UsageType.USERS,
  whatsappMessages: UsageType.WHATSAPP_MESSAGES,
};

export function mapOverageKeyToUsageType(key: string): UsageType | null {
  return OVERAGE_KEY_TO_USAGE_TYPE[key] ?? null;
}
