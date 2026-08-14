import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

interface ResolvedTemplate {
  content: string;
  buttons?: { id: string; text: string; action?: string }[];
  buttonType: 'QUICK_REPLY' | 'CALL_TO_ACTION';
  textFallback: string;
  metaTemplateId?: string;
}

@Injectable()
export class TemplateModeService {
  private readonly logger = new Logger(TemplateModeService.name);
  private useProductionMode: boolean;

  constructor(private configService: AppConfigService) {
    this.useProductionMode = this.configService.getMetaConfig().productionMode;
    this.logger.log(
      `WhatsApp Templates initialized in ${this.useProductionMode ? 'PRODUCTION' : 'SANDBOX'} mode`,
    );
  }

  getMessageForMode(resolved: ResolvedTemplate): string {
    if (this.useProductionMode && resolved.metaTemplateId)
      return resolved.content;
    return resolved.textFallback;
  }

  isProductionMode(): boolean {
    return this.useProductionMode;
  }

  getTemplateMetadata(resolved: ResolvedTemplate) {
    return {
      isProduction: this.useProductionMode,
      hasApprovedTemplate: !!resolved.metaTemplateId,
      metaTemplateId: resolved.metaTemplateId,
      buttonType: resolved.buttonType,
      useButtons: this.useProductionMode && !!resolved.metaTemplateId,
    };
  }
}
