// jscpd:ignore-start
import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@workspace/db';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import type {
  WhatsappTemplateCategory,
  WhatsappButtonType,
  WhatsappTemplateStatus,
} from '@workspace/db';

interface TemplateButton {
  id: string;
  text: string;
  action?: string;
}

interface TemplateVariable {
  name: string;
  required: boolean;
  defaultValue?: string;
}

function toNullableJsonValue(
  // jscpd:ignore-end
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (value === null || value === undefined) return Prisma.JsonNull;

  return toPrismaInputJsonValue(value);
}

@Injectable()
export class TemplateDataService {
  private readonly logger = new Logger(TemplateDataService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async getCustomTemplate(templateId: string, clinicId: string) {
    return this.prisma.whatsappTemplate.findFirst({
      where: {
        clinicId,
        name: templateId,
        isActive: true,
      },
      orderBy: { version: 'desc' },
    });
  }

  async getTemplateById(id: string) {
    return this.prisma.whatsappTemplate.findUnique({
      where: { id },
    });
  }

  async listTemplates(clinicId: string) {
    return this.prisma.whatsappTemplate.findMany({
      where: { clinicId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }, { version: 'desc' }],
    });
  }

  async seedDefaultTemplates(
    clinicId: string,
    defaultTemplates: Record<
      string,
      {
        name: string;
        category: WhatsappTemplateCategory;
        content: string;
        variables: TemplateVariable[];
        buttonType: WhatsappButtonType;
        buttons?: TemplateButton[];
        textFallback: string;
      }
    >,
  ): Promise<void> {
    const existingTemplates = await this.prisma.whatsappTemplate.findMany({
      where: { clinicId },
    });

    if (existingTemplates.length > 0) {
      this.logger.log(
        `Clinic ${clinicId} already has templates, skipping seed`,
      );
      return;
    }

    const templateEntries = Object.entries(defaultTemplates);
    for (const [_, template] of templateEntries) {
      await this.prisma.whatsappTemplate.create({
        data: {
          clinicId,
          name: template.name,
          category: template.category,
          content: template.content,
          variables: JSON.parse(JSON.stringify(template.variables)),
          buttonType: template.buttonType,
          buttons: template.buttons
            ? JSON.parse(JSON.stringify(template.buttons))
            : null,
          status: 'DRAFT',
          isDefault: true,
          isActive: true,
        },
      });
    }

    this.logger.log(
      `Seeded ${templateEntries.length} templates for clinic ${clinicId}`,
    );
  }

  async updateTemplateStatus(
    templateId: string,
    status: WhatsappTemplateStatus,
    metaTemplateId?: string,
  ) {
    return this.prisma.whatsappTemplate.update({
      where: { id: templateId },
      data: {
        status,
        metaTemplateId,
        updatedAt: this.clock.now(),
      },
    });
  }

  async createTemplate(data: {
    clinicId: string;
    name: string;
    category: WhatsappTemplateCategory;
    content: string;
    variables?: Record<string, unknown>;
    buttonType: WhatsappButtonType;
    buttons?: unknown;
  }) {
    return this.prisma.whatsappTemplate.create({
      data: {
        ...data,
        status: 'DRAFT',
        isDefault: false,
        isActive: true,
        variables: toNullableJsonValue(data.variables),
        buttons: toNullableJsonValue(data.buttons),
      },
    });
  }

  async updateTemplate(
    id: string,
    data: {
      content?: string;
      category?: WhatsappTemplateCategory;
      variables?: Record<string, unknown>;
      buttons?: unknown;
      status?: WhatsappTemplateStatus;
    },
  ) {
    return this.prisma.whatsappTemplate.update({
      where: { id },
      data: {
        ...data,
        updatedAt: this.clock.now(),
        variables:
          data.variables === undefined
            ? undefined
            : toNullableJsonValue(data.variables),
        buttons:
          data.buttons === undefined
            ? undefined
            : toNullableJsonValue(data.buttons),
      },
    });
  }

  async deleteTemplate(id: string) {
    return this.prisma.whatsappTemplate.update({
      where: { id },
      data: { isActive: false, updatedAt: this.clock.now() },
    });
  }
}
