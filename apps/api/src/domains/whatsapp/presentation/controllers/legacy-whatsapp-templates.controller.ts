import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import type { WhatsappTemplate } from '@workspace/db';
import type { ClinicWhatsappTemplate } from '@workspace/types';
import { WhatsappService } from '@/domains/whatsapp/application/services/whatsapp-clinic-facade.service';
import {
  ClinicWhatsappTemplateListResponseDto,
  ClinicWhatsappTemplateResponseDto,
  CreateWhatsappTemplateDto,
  SuccessResponseDto,
  UpdateWhatsappTemplateDto,
  WhatsappDefaultTemplatesResponseDto,
  WhatsappTemplateListResponseDto,
} from '@/domains/whatsapp/presentation/dto/whatsapp-response.dto';
import { LegacyWhatsappClinicAccess } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-clinic.access';
import { requireClinicId } from '@/domains/whatsapp/presentation/controllers/legacy-whatsapp-clinic.helpers';

function toClinicTemplate(row: WhatsappTemplate): ClinicWhatsappTemplate {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    content: row.content,
    status: row.status,
    isDefault: row.isDefault,
    isActive: row.isActive,
    updatedAt: row.updatedAt,
  };
}

@Controller('whatsapp')
@LegacyWhatsappClinicAccess()
export class LegacyWhatsappTemplatesController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('templates')
  @ZodSerializerDto(WhatsappTemplateListResponseDto)
  async listTemplates(@Req() req: Request) {
    return this.whatsappService.listTemplates(requireClinicId(req));
  }

  @Get('templates/defaults')
  @ZodSerializerDto(WhatsappDefaultTemplatesResponseDto)
  getDefaultTemplates() {
    return this.whatsappService.getDefaultTemplateNames();
  }

  @Post('templates/seed')
  @ZodSerializerDto(SuccessResponseDto)
  async seedTemplates(@Req() req: Request) {
    const clinicId = requireClinicId(req);
    await this.whatsappService.seedDefaultTemplates(clinicId);
    return { success: true, message: 'Templates seeded successfully' };
  }

  @Get('templates/custom')
  @ZodSerializerDto(ClinicWhatsappTemplateListResponseDto)
  async listCustomTemplates(@Req() req: Request) {
    const rows = await this.whatsappService.listTemplates(requireClinicId(req));
    return rows.filter((row) => row.isActive).map(toClinicTemplate);
  }

  @Post('templates/custom')
  @ZodSerializerDto(ClinicWhatsappTemplateResponseDto)
  async createCustomTemplate(
    @Req() req: Request,
    @Body() dto: CreateWhatsappTemplateDto,
  ) {
    const clinicId = requireClinicId(req);
    try {
      const row = await this.whatsappService.createCustomTemplate(
        clinicId,
        dto,
      );
      return toClinicTemplate(row);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new BadRequestException(
          'A template with this name already exists.',
        );
      }
      throw error;
    }
  }

  @Patch('templates/custom/:id')
  @ZodSerializerDto(ClinicWhatsappTemplateResponseDto)
  async updateCustomTemplate(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateWhatsappTemplateDto,
  ) {
    await this.assertOwnedCustomTemplate(req, id);
    const row = await this.whatsappService.updateCustomTemplate(id, dto);
    return toClinicTemplate(row);
  }

  @Delete('templates/custom/:id')
  @ZodSerializerDto(SuccessResponseDto)
  async deleteCustomTemplate(@Req() req: Request, @Param('id') id: string) {
    await this.assertOwnedCustomTemplate(req, id);
    await this.whatsappService.deleteCustomTemplate(id);
    return { success: true, message: 'Template deleted' };
  }

  /**
   * Guard mutations: the template must belong to the caller's clinic and not be
   * a seeded default (defaults are managed by the platform, not the clinic).
   */
  private async assertOwnedCustomTemplate(req: Request, id: string) {
    const clinicId = requireClinicId(req);
    const existing = await this.whatsappService.getTemplateById(id);
    if (!existing || existing.clinicId !== clinicId || !existing.isActive)
      throw new NotFoundException('Template not found');
    if (existing.isDefault)
      throw new ForbiddenException('Default templates cannot be modified');
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}
