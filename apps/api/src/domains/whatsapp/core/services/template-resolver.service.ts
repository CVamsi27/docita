// jscpd:ignore-start
import { Injectable } from '@nestjs/common';
import {
  TemplateResolutionService,
  type ResolvedTemplate,
} from '@/shared/whatsapp/template-resolution.service';

export type { ResolvedTemplate };

@Injectable()
export class TemplateResolverService {
  constructor(private readonly templateResolution: TemplateResolutionService) {}

  resolveTemplate(
    templateId: string,
    variables: Record<string, string>,
    clinicId?: string,
  ): Promise<ResolvedTemplate | null> {
    return this.templateResolution.resolveTemplate(
      templateId,
      variables,
      clinicId,
    );
  }
}
// jscpd:ignore-end
