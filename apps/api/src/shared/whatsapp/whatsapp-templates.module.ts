import { Module } from '@nestjs/common';
import { AppConfigModule } from '@/shared/modules/config/config.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { DefaultTemplatesService } from './default-templates.service';
import { TemplateDataService } from './template-data.service';
import { TemplateVariableService } from './template-variable.service';
import { TemplateResolutionService } from './template-resolution.service';
import { TemplateModeService } from './template-mode.service';
import { TemplatesFacadeService } from './templates-facade.service';

/** Shared WhatsApp template pipeline used by legacy messaging and domain modules. */
@Module({
  imports: [PrismaModule, AppConfigModule],
  providers: [
    DefaultTemplatesService,
    TemplateDataService,
    TemplateVariableService,
    TemplateResolutionService,
    TemplateModeService,
    TemplatesFacadeService,
  ],
  exports: [
    DefaultTemplatesService,
    TemplateDataService,
    TemplateVariableService,
    TemplateResolutionService,
    TemplateModeService,
    TemplatesFacadeService,
  ],
})
export class WhatsappTemplatesModule {}
