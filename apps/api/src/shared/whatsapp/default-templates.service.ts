import { Injectable } from '@nestjs/common';
import { DefaultTemplatesLoader } from './default-templates.loader';

@Injectable()
export class DefaultTemplatesService extends DefaultTemplatesLoader {}
