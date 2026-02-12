import { Injectable, Logger } from '@nestjs/common';

export interface ResolvedTemplate {
  content: string;
  buttons?: { id: string; text: string; action?: string }[];
  buttonType: 'QUICK_REPLY' | 'CALL_TO_ACTION';
  textFallback: string;
  metaTemplateId?: string;
}

/**
 * TemplateModeService - Handles production vs sandbox mode logic
 * Responsibilities:
 * - Determining which message version to use (production vs sandbox)
 * - Handling production mode (approved templates via Meta Cloud API)
 * - Handling sandbox mode (text fallback with reply numbers)
 */
@Injectable()
export class TemplateModeService {
  private readonly logger = new Logger(TemplateModeService.name);
  private useProductionMode: boolean;

  constructor() {
    this.useProductionMode = process.env.WHATSAPP_PRODUCTION_MODE === 'true';
    this.logger.log(
      `WhatsApp Templates initialized in ${this.useProductionMode ? 'PRODUCTION' : 'SANDBOX'} mode`,
    );
  }

  /**
   * Get the text message to send based on mode
   * In sandbox: returns textFallback (with reply numbers)
   * In production: returns content (with buttons handled by Meta Cloud API)
   */
  getMessageForMode(resolved: ResolvedTemplate): string {
    if (this.useProductionMode && resolved.metaTemplateId) {
      // In production with approved template, use the content
      // Buttons will be handled by Meta Cloud API
      return resolved.content;
    }
    // In sandbox or without approved template, use text fallback with reply numbers
    return resolved.textFallback;
  }

  /**
   * Check if running in production mode
   */
  isProductionMode(): boolean {
    return this.useProductionMode;
  }

  /**
   * Get template metadata for sending based on mode
   */
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
