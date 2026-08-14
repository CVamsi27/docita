import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { TemplatesService } from './templates.service';
import {
  TEMPLATES_REPOSITORY_TOKEN,
  type ITemplatesRepository,
  type TemplateRecord,
} from '@/domains/documents/application/ports/templates.repository.port';

describe('TemplatesService', () => {
  let service: TemplatesService;
  let repo: {
    create: jest.Mock<(...args: unknown[]) => Promise<TemplateRecord>>;
    findAll: jest.Mock<(...args: unknown[]) => Promise<TemplateRecord[]>>;
    findById: jest.Mock<(...args: unknown[]) => Promise<TemplateRecord | null>>;
    update: jest.Mock<(...args: unknown[]) => Promise<TemplateRecord>>;
    delete: jest.Mock<(...args: unknown[]) => Promise<TemplateRecord>>;
  };

  beforeEach(async () => {
    repo = {
      create: jest.fn<(...args: unknown[]) => Promise<TemplateRecord>>(),
      findAll: jest.fn<(...args: unknown[]) => Promise<TemplateRecord[]>>(),
      findById:
        jest.fn<(...args: unknown[]) => Promise<TemplateRecord | null>>(),
      update: jest.fn<(...args: unknown[]) => Promise<TemplateRecord>>(),
      delete: jest.fn<(...args: unknown[]) => Promise<TemplateRecord>>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        {
          provide: TEMPLATES_REPOSITORY_TOKEN,
          useValue: repo as unknown as ITemplatesRepository,
        },
      ],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
  });

  it('forwards create payloads verbatim to the repository', async () => {
    const payload = {
      name: 'Diabetes follow-up',
      speciality: 'ENDOCRINOLOGY',
      fields: [{ key: 'hba1c' }],
    };
    const expected = { id: 'tpl_1', clinicId: null, ...payload };
    repo.create.mockResolvedValueOnce(expected);

    const result = await service.create(payload);

    expect(repo.create).toHaveBeenCalledWith(payload);
    expect(result).toBe(expected);
  });

  it('forwards findAll including undefined params', async () => {
    repo.findAll.mockResolvedValueOnce([]);

    await service.findAll();
    expect(repo.findAll).toHaveBeenCalledWith(undefined);

    repo.findAll.mockClear();
    repo.findAll.mockResolvedValueOnce([]);
    const query = { search: 'hba1c', speciality: 'ENDOCRINOLOGY' };
    await service.findAll(query);
    expect(repo.findAll).toHaveBeenCalledWith(query);
  });

  it('forwards findOne to findById and surfaces null when missing', async () => {
    repo.findById.mockResolvedValueOnce(null);

    const result = await service.findOne('missing');

    expect(repo.findById).toHaveBeenCalledWith('missing');
    expect(result).toBeNull();
  });

  it('forwards update id + patch to the repository', async () => {
    const patch = { name: 'Diabetes annual' };
    const expected = {
      id: 'tpl_1',
      clinicId: null,
      name: patch.name,
      speciality: 'ENDOCRINOLOGY',
      fields: [],
    };
    repo.update.mockResolvedValueOnce(expected);

    const result = await service.update('tpl_1', patch);

    expect(repo.update).toHaveBeenCalledWith('tpl_1', patch);
    expect(result).toBe(expected);
  });

  it('forwards remove id to the repository delete', async () => {
    const expected = { id: 'tpl_1', clinicId: null };
    repo.delete.mockResolvedValueOnce(expected);

    const result = await service.remove('tpl_1');

    expect(repo.delete).toHaveBeenCalledWith('tpl_1');
    expect(result).toBe(expected);
  });
});
