import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PatientTagsService } from './patient-tags.service';
import type { IPatientTagsRepository } from '@/domains/patients/core/repositories/patient-tags.repository.interface';

function makeCtx() {
  const repo = {
    patientExists: jest.fn<(p: unknown) => Promise<boolean>>(async () => true),
    list: jest.fn<(p: unknown) => Promise<unknown>>(async () => ['tag']),
    create: jest.fn<(p: unknown) => Promise<unknown>>(async () => ({
      id: 't1',
    })),
    findTag: jest.fn<(p: unknown) => Promise<unknown>>(async () => ({
      id: 't1',
    })),
    update: jest.fn<(p: unknown) => Promise<unknown>>(async () => ({
      id: 't1',
    })),
    remove: jest.fn<(p: unknown) => Promise<void>>(async () => undefined),
  };
  const service = new PatientTagsService(
    repo as unknown as IPatientTagsRepository,
  );
  return { service, repo };
}

const base = { clinicId: 'c-1', patientId: 'p-1' };

describe('PatientTagsService.list', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  it('throws NotFound for a patient outside the clinic', async () => {
    ctx.repo.patientExists.mockResolvedValueOnce(false);
    await expect(ctx.service.list(base)).rejects.toThrow(NotFoundException);
    expect(ctx.repo.list).not.toHaveBeenCalled();
  });

  it('lists the patient tags when the patient exists', async () => {
    await expect(ctx.service.list(base)).resolves.toEqual(['tag']);
    expect(ctx.repo.list).toHaveBeenCalledWith({ patientId: 'p-1' });
  });
});

describe('PatientTagsService.create', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  it('throws NotFound for a missing patient', async () => {
    ctx.repo.patientExists.mockResolvedValueOnce(false);
    await expect(
      ctx.service.create({ ...base, tag: 'VIP', color: '#fff' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects a blank tag label', async () => {
    await expect(
      ctx.service.create({ ...base, tag: '   ', color: '#fff' }),
    ).rejects.toThrow(BadRequestException);
    expect(ctx.repo.create).not.toHaveBeenCalled();
  });

  it('creates with a normalized (trimmed) tag label', async () => {
    await ctx.service.create({ ...base, tag: '  VIP  ', color: '#fff' });
    expect(ctx.repo.create).toHaveBeenCalledWith({
      patientId: 'p-1',
      tag: 'VIP',
      color: '#fff',
    });
  });
});

describe('PatientTagsService.update', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  it('throws NotFound when the tag does not belong to the patient', async () => {
    ctx.repo.findTag.mockResolvedValueOnce(null);
    await expect(
      ctx.service.update({ ...base, tagId: 't1', tag: 'X' }),
    ).rejects.toThrow('Tag not found');
    expect(ctx.repo.update).not.toHaveBeenCalled();
  });

  it('updates only the provided fields with a normalized tag', async () => {
    await ctx.service.update({ ...base, tagId: 't1', tag: '  New  ' });
    expect(ctx.repo.update).toHaveBeenCalledWith({ tagId: 't1', tag: 'New' });
  });
});

describe('PatientTagsService.remove', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  it('throws NotFound when the patient is missing', async () => {
    ctx.repo.patientExists.mockResolvedValueOnce(false);
    await expect(ctx.service.remove({ ...base, tagId: 't1' })).rejects.toThrow(
      NotFoundException,
    );
    expect(ctx.repo.remove).not.toHaveBeenCalled();
  });

  it('removes an existing tag', async () => {
    await ctx.service.remove({ ...base, tagId: 't1' });
    expect(ctx.repo.remove).toHaveBeenCalledWith({ tagId: 't1' });
  });
});
