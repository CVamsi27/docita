import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { PrismaInvoiceRepository } from './prisma.invoice.repository';
import { PrismaService } from '@/prisma/prisma.service';

type AnyAsync = (...args: unknown[]) => Promise<unknown>;

describe('PrismaInvoiceRepository tenant guards', () => {
  const readClient = {
    invoice: {
      findFirst: jest.fn<AnyAsync>(),
      findMany: jest.fn<AnyAsync>(),
    },
    patient: {
      findFirst: jest.fn<AnyAsync>(),
    },
  };

  const writeClient = {
    invoice: {
      updateMany: jest.fn<AnyAsync>(),
      deleteMany: jest.fn<AnyAsync>(),
      findFirst: jest.fn<AnyAsync>(),
    },
  };

  let repository: PrismaInvoiceRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    const prismaService = Object.create(
      PrismaService.prototype,
    ) as PrismaService;
    Object.defineProperties(prismaService, {
      getReadClient: { value: () => readClient, writable: true },
      invoice: { value: writeClient.invoice, writable: true },
    });
    repository = new PrismaInvoiceRepository(prismaService);
  });

  it('belongsToClinic returns true when the invoice exists in the clinic', async () => {
    readClient.invoice.findFirst.mockResolvedValueOnce({ id: 'inv-1' });

    const result = await repository.belongsToClinic('inv-1', 'clinic-a');

    expect(result).toBe(true);
    expect(readClient.invoice.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'inv-1',
          OR: expect.arrayContaining([
            expect.objectContaining({ clinicId: 'clinic-a' }),
            expect.objectContaining({
              clinicId: null,
              patient: { clinicId: 'clinic-a' },
            }),
          ]),
        }),
        select: { id: true },
      }),
    );
  });

  it('belongsToClinic returns false when the invoice is not in the clinic', async () => {
    readClient.invoice.findFirst.mockResolvedValueOnce(null);

    const result = await repository.belongsToClinic('inv-1', 'other-clinic');

    expect(result).toBe(false);
  });

  it('findById uses an OR clause covering both direct clinicId and patient.clinicId fallback', async () => {
    readClient.invoice.findFirst.mockResolvedValueOnce(null);

    const result = await repository.findById('inv-1', 'other-clinic');

    expect(result).toBeNull();
    expect(readClient.invoice.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'inv-1',
          OR: expect.arrayContaining([
            expect.objectContaining({ clinicId: 'other-clinic' }),
            expect.objectContaining({
              clinicId: null,
              patient: { clinicId: 'other-clinic' },
            }),
          ]),
        }),
      }),
    );
  });

  it('update throws NotFound semantics when no invoice matches the (id, clinic) tuple', async () => {
    writeClient.invoice.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      repository.update('inv-1', { status: 'PAID' } as never, 'other-clinic'),
    ).rejects.toThrow('Invoice inv-1 not found');
  });

  it('delete uses deleteMany scoped by both id and clinic ownership', async () => {
    writeClient.invoice.deleteMany.mockResolvedValueOnce({ count: 0 });

    await repository.delete('inv-1', 'other-clinic');

    expect(writeClient.invoice.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'inv-1' }),
      }),
    );
  });

  it('findAll applies multi-status desk filters with clinic and patient scope', async () => {
    readClient.invoice.findMany.mockResolvedValueOnce([
      { id: 'pending-inv' },
      { id: 'partial-inv' },
    ]);

    const result = await repository.findAll({
      clinicId: 'clinic-1',
      patientId: 'patient-1',
      statuses: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'],
      limit: 50,
    });

    expect(result.items).toEqual([
      { id: 'pending-inv' },
      { id: 'partial-inv' },
    ]);
    expect(readClient.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 51,
        where: {
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                expect.objectContaining({ clinicId: 'clinic-1' }),
                expect.objectContaining({
                  clinicId: null,
                  patient: { clinicId: 'clinic-1' },
                }),
              ]),
            }),
            { patientId: 'patient-1' },
            { status: { in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] } },
          ]),
        },
      }),
    );
  });
});
