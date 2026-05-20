import { Injectable } from '@nestjs/common';
import { DefaultTemplatesLoader } from './default-templates.loader';

export type {
  DefaultTemplateDefinition,
  TemplateButton,
  TemplateCategory,
  TemplateVariable,
  WhatsAppDefaultTemplateDefinition,
} from '@workspace/types';

@Injectable()
export class DefaultTemplatesService extends DefaultTemplatesLoader {}
