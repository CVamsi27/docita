import {
  WHATSAPP_MESSAGE_REPOSITORY_TOKEN,
  WHATSAPP_REPOSITORY_TOKEN,
  WHATSAPP_TEMPLATE_REPOSITORY_TOKEN,
} from '@/domains/whatsapp/application/ports/whatsapp.repository.port';
import { PrismaWhatsAppMessageRepository } from './prisma-whatsapp-message.repository';
import { PrismaWhatsAppRepository } from './prisma-whatsapp.repository';
import { PrismaWhatsAppTemplateRepository } from './prisma-whatsapp-template.repository';

export const WHATSAPP_REPOSITORY_PROVIDERS = [
  PrismaWhatsAppMessageRepository,
  PrismaWhatsAppTemplateRepository,
  {
    provide: WHATSAPP_MESSAGE_REPOSITORY_TOKEN,
    useExisting: PrismaWhatsAppMessageRepository,
  },
  {
    provide: WHATSAPP_TEMPLATE_REPOSITORY_TOKEN,
    useExisting: PrismaWhatsAppTemplateRepository,
  },
  {
    provide: WHATSAPP_REPOSITORY_TOKEN,
    useClass: PrismaWhatsAppRepository,
  },
] as const;
