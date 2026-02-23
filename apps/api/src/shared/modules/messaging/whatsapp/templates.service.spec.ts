import { Test, TestingModule } from '@nestjs/testing';
import { TemplatesService } from './templates.service';
import { DefaultTemplatesService } from './default-templates.service';
import { TemplateDataService } from './template-data.service';
import { TemplateVariableService } from './template-variable.service';
import { TemplateResolutionService } from './template-resolution.service';
import { TemplateModeService } from './template-mode.service';

describe('TemplatesService', () => {
  let service: TemplatesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        {
          provide: DefaultTemplatesService,
          useValue: {
            getDefaultTemplateNames: jest.fn(),
            getDefaultTemplate: jest.fn(),
            getDefaultTemplates: jest.fn(),
          },
        },
        {
          provide: TemplateDataService,
          useValue: {
            getTemplate: jest.fn(),
            listTemplates: jest.fn(),
            createTemplate: jest.fn(),
            updateTemplate: jest.fn(),
            deleteTemplate: jest.fn(),
          },
        },
        {
          provide: TemplateVariableService,
          useValue: {
            validateVariables: jest.fn(),
            substituteVariables: jest.fn(),
            getRequiredVariables: jest.fn(),
          },
        },
        {
          provide: TemplateResolutionService,
          useValue: {
            getTemplate: jest.fn(),
            resolveTemplate: jest.fn(),
          },
        },
        {
          provide: TemplateModeService,
          useValue: {
            getMessageForMode: jest.fn(),
            applyModeTransformations: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDefaultTemplateNames', () => {
    it('should return default template names', () => {
      const defaultTemplatesService = service['defaultTemplates'];
      const mockNames = ['template1', 'template2'];
      (
        defaultTemplatesService.getDefaultTemplateNames as jest.Mock
      ).mockReturnValue(mockNames);

      const names = service.getDefaultTemplateNames();

      expect(names).toEqual(mockNames);
    });
  });
});
