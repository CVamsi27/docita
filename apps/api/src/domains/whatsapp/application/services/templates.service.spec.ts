import { Test, TestingModule } from '@nestjs/testing';
import { TemplatesFacadeService as TemplatesService } from '@/shared/whatsapp/templates-facade.service';
import { DefaultTemplatesService } from '@/shared/whatsapp/default-templates.service';
import { TemplateDataService } from '@/shared/whatsapp/template-data.service';
import { TemplateVariableService } from '@/shared/whatsapp/template-variable.service';
import { TemplateResolutionService } from '@/shared/whatsapp/template-resolution.service';
import { TemplateModeService } from '@/shared/whatsapp/template-mode.service';

describe('TemplatesService', () => {
  let service: TemplatesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        { provide: DefaultTemplatesService, useValue: {} },
        { provide: TemplateDataService, useValue: {} },
        { provide: TemplateVariableService, useValue: {} },
        { provide: TemplateResolutionService, useValue: {} },
        { provide: TemplateModeService, useValue: {} },
      ],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
