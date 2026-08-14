import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { MedicalHistoryConditionsService } from './medical-history-conditions.service';
import type { PatientPersistencePort } from '@/domains/patients/application/ports/patient-persistence.port';
import type { MedicalHistoryFactory } from '@/domains/patients/core/factories/medical-history.factory';

type Fn = jest.Mock<(args?: unknown) => Promise<unknown>>;

function makeCtx() {
  const patientMedicalCondition = {
    findFirst: jest.fn<(a?: unknown) => Promise<unknown>>(async () => null),
    update: jest.fn<(a?: unknown) => Promise<unknown>>(async () => ({})),
    delete: jest.fn<(a?: unknown) => Promise<unknown>>(async () => ({})),
  };
  const patientAllergy = {
    findFirst: jest.fn<(a?: unknown) => Promise<unknown>>(async () => null),
    findMany: jest.fn<(a?: unknown) => Promise<unknown>>(async () => []),
    create: jest.fn<(a?: unknown) => Promise<unknown>>(async () => ({
      id: 'a1',
    })),
    update: jest.fn<(a?: unknown) => Promise<unknown>>(async () => ({
      id: 'a1',
    })),
    delete: jest.fn<(a?: unknown) => Promise<unknown>>(async () => ({})),
  };
  const persistence = {
    patientMedicalCondition,
    patientAllergy,
  } as Record<string, unknown>;
  persistence.$transaction = jest.fn(
    async (cb: (tx: unknown) => Promise<unknown>) => cb(persistence),
  );

  const factory = {
    createCondition: jest.fn((dto: unknown) => dto),
    createAllergy: jest.fn((dto: { allergen: string }) => ({
      allergen: dto.allergen,
      allergyType: 'MEDICATION',
      severity: 'MILD',
    })),
  } as unknown as MedicalHistoryFactory;

  const service = new MedicalHistoryConditionsService(
    persistence as unknown as PatientPersistencePort,
    factory,
  );
  return { service, patientMedicalCondition, patientAllergy };
}

describe('MedicalHistoryConditionsService conditions', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  it('updateCondition throws NotFound when the condition is not the patient’s', async () => {
    await expect(
      ctx.service.updateCondition('c1', 'p1', {} as never),
    ).rejects.toThrow(NotFoundException);
    expect(ctx.patientMedicalCondition.update).not.toHaveBeenCalled();
  });

  it('deleteCondition throws NotFound when the condition is missing', async () => {
    await expect(ctx.service.deleteCondition('c1', 'p1')).rejects.toThrow(
      NotFoundException,
    );
    expect(ctx.patientMedicalCondition.delete).not.toHaveBeenCalled();
  });
});

describe('MedicalHistoryConditionsService allergies', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  it('createAllergy rejects a case-insensitive duplicate allergen', async () => {
    (ctx.patientAllergy.findMany as Fn).mockResolvedValueOnce([
      { id: 'a-existing', allergen: 'Penicillin' },
    ]);

    await expect(
      ctx.service.createAllergy('p1', { allergen: 'penicillin' } as never),
    ).rejects.toThrow(ConflictException);
    expect(ctx.patientAllergy.create).not.toHaveBeenCalled();
  });

  it('createAllergy persists a unique allergen', async () => {
    (ctx.patientAllergy.findMany as Fn).mockResolvedValueOnce([]);

    await ctx.service.createAllergy('p1', { allergen: 'Aspirin' } as never);

    expect(ctx.patientAllergy.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ patientId: 'p1', allergen: 'Aspirin' }),
    });
  });

  it('updateAllergy throws NotFound when the allergy is not the patient’s', async () => {
    (ctx.patientAllergy.findFirst as Fn).mockResolvedValueOnce(null);

    await expect(
      ctx.service.updateAllergy('a1', 'p1', { allergen: 'X' } as never),
    ).rejects.toThrow(NotFoundException);
  });

  it('updateAllergy rejects renaming onto another allergy’s allergen', async () => {
    (ctx.patientAllergy.findFirst as Fn).mockResolvedValueOnce({ id: 'a1' });
    (ctx.patientAllergy.findMany as Fn).mockResolvedValueOnce([
      { id: 'a2', allergen: 'Penicillin' },
    ]);

    await expect(
      ctx.service.updateAllergy('a1', 'p1', {
        allergen: 'penicillin',
      } as never),
    ).rejects.toThrow(ConflictException);
    expect(ctx.patientAllergy.update).not.toHaveBeenCalled();
  });

  it('deleteAllergy throws NotFound when the allergy is missing', async () => {
    (ctx.patientAllergy.findFirst as Fn).mockResolvedValueOnce(null);

    await expect(ctx.service.deleteAllergy('a1', 'p1')).rejects.toThrow(
      NotFoundException,
    );
    expect(ctx.patientAllergy.delete).not.toHaveBeenCalled();
  });

  it('deleteAllergy removes an existing allergy', async () => {
    (ctx.patientAllergy.findFirst as Fn).mockResolvedValueOnce({ id: 'a1' });

    await ctx.service.deleteAllergy('a1', 'p1');

    expect(ctx.patientAllergy.delete).toHaveBeenCalledWith({
      where: { id: 'a1' },
    });
  });
});
