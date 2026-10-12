import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  INestApplication,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import {
  setupTestDatabase,
  resetDatabase,
  getPrismaInstance,
  closeDatabase,
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';
import { PrismaInventoryRepository } from '@/domains/inventory/infrastructure/repositories/prisma-inventory.repository';
import { InventoryCommandService } from '@/domains/inventory/application/services/inventory-command.service';

/**
 * W03 — inventory movement ledger authority.
 *
 * Three defects motivated this suite.
 *
 * 1. `PATCH /inventory/:id` wrote `InventoryItem.quantity` directly with no
 *    movement row, so `sum(ledger deltas)` diverged from stock and a balance
 *    edit could even drive stock negative — the movement path always guarded
 *    with `quantity >= delta`, the direct write did not.
 * 2. `referenceType` / `referenceId` carried no uniqueness, so a retried
 *    purchase-order receipt double-counted stock.
 * 3. `unit` was a free string on the item with no history, so re-unitising
 *    silently reinterpreted every recorded movement.
 *
 * Runs against real PostgreSQL so the (clinicId, operationId) unique index and
 * the conditional `quantity >= delta` decrement are what is under test.
 */
describe('Inventory movement ledger (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let repository: PrismaInventoryRepository;
  let command: InventoryCommandService;
  let clinicId: string;
  let userId: string;

  beforeAll(async () => {
    setupTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    setPrismaInstance(prisma);
    repository = new PrismaInventoryRepository(prisma);
    command = new InventoryCommandService(repository);
  });

  beforeEach(async () => {
    await resetDatabase();
    const clinic = await factories.clinic();
    const user = (await factories.user({ clinicId: clinic.id })).user;
    clinicId = clinic.id;
    userId = user.id;
  });

  afterAll(async () => {
    if (app) await app.close();
    await closeDatabase();
  });

  /**
   * Creates an item the way the real command service does, so the opening
   * balance also lands in the ledger as an INITIAL movement. Reconciliation
   * assertions are only meaningful if the opening row is accounted for.
   */
  const seedItem = async (quantity = 10, unit = 'tablets') =>
    repository.createItem({
      clinicId,
      name: 'Paracetamol',
      category: 'MEDICINE',
      quantity,
      minQuantity: 2,
      unit,
      active: true,
      initialMovement:
        quantity > 0
          ? {
              type: 'INITIAL',
              quantity,
              createdBy: userId,
              notes: 'Initial stock',
            }
          : undefined,
    });

  const addMovement = (
    itemId: string,
    data: {
      type: string;
      quantity: number;
      operationId?: string;
      referenceId?: string;
    },
  ) =>
    command.addMovement(clinicId, itemId, userId, {
      ...data,
      operationId: data.operationId,
      referenceId: data.referenceId,
    } as never);

  const quantityOf = async (itemId: string) =>
    (await prisma.inventoryItem.findUniqueOrThrow({ where: { id: itemId } }))
      .quantity;

  const movementCount = async (itemId: string) =>
    prisma.inventoryMovement.count({ where: { inventoryItemId: itemId } });

  /** Asserts the ledger reconstructs stock exactly for every item. */
  const expectLedgerReconciled = async () => {
    const rows = await repository.reconcileLedger(clinicId);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.filter((row) => row.drift !== 0)).toEqual([]);
  };

  it('reconciles the ledger with stock for a freshly created item', async () => {
    const item = await seedItem(25);

    expect(await quantityOf(item.id)).toBe(25);
    await expectLedgerReconciled();
  });

  it('cannot oversell when parallel decrements contend for the same stock', async () => {
    const item = await seedItem(10);

    // Five dispenses of 4 against 10 units: only two can succeed.
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        addMovement(item.id, {
          type: 'OUT',
          quantity: 4,
        }),
      ),
    );

    const applied = results.filter((r) => r.status === 'fulfilled');
    expect(applied).toHaveLength(2);
    for (const loser of results.filter((r) => r.status === 'rejected')) {
      expect((loser as PromiseRejectedResult).reason).toBeInstanceOf(
        BadRequestException,
      );
      // The cause matters as much as the class: an oversell must surface as an
      // insufficient-stock refusal, not as some unrelated rejection.
      expect((loser as PromiseRejectedResult).reason.message).toMatch(
        /Insufficient stock/,
      );
    }

    expect(await quantityOf(item.id)).toBe(2);
    expect(await movementCount(item.id)).toBe(3); // INITIAL + 2 OUT
    await expectLedgerReconciled();
  });

  it('applies a repeated operation exactly once', async () => {
    const item = await seedItem(0);

    const first = await addMovement(item.id, {
      type: 'IN',
      quantity: 40,
      operationId: 'po-8821-line-3',
    });
    const retry = await addMovement(item.id, {
      type: 'IN',
      quantity: 40,
      operationId: 'po-8821-line-3',
    });

    expect(retry.id).toBe(first.id);
    expect(await quantityOf(item.id)).toBe(40);
    expect(await movementCount(item.id)).toBe(1);
    await expectLedgerReconciled();
  });

  it('elects one winner when the same operation is retried in parallel', async () => {
    const item = await seedItem(0);

    // The retry storm a flaky supplier integration produces: the same receipt
    // delivered several times at once.
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () =>
        addMovement(item.id, {
          type: 'IN',
          quantity: 25,
          operationId: 'po-9001',
        }),
      ),
    );

    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    const ids = new Set(
      results.map(
        (r) => (r as PromiseFulfilledResult<{ id: string }>).value.id,
      ),
    );
    expect(ids.size).toBe(1);
    expect(await quantityOf(item.id)).toBe(25);
    expect(await movementCount(item.id)).toBe(1);
  });

  it('keeps distinct operations separate', async () => {
    const item = await seedItem(0);

    await addMovement(item.id, {
      type: 'IN',
      quantity: 10,
      operationId: 'po-1',
    });
    await addMovement(item.id, {
      type: 'IN',
      quantity: 15,
      operationId: 'po-2',
    });

    expect(await quantityOf(item.id)).toBe(25);
    expect(await movementCount(item.id)).toBe(2);
    await expectLedgerReconciled();
  });

  it('records a balance correction as a ledger movement, not a silent edit', async () => {
    const item = await seedItem(100);

    await command.updateItem(clinicId, item.id, userId, { quantity: 70 });

    expect(await quantityOf(item.id)).toBe(70);

    // A downward correction must be distinguishable from an upward one, or the
    // ledger reconstructs it with the wrong sign.
    const adjustment = await prisma.inventoryMovement.findFirstOrThrow({
      where: { inventoryItemId: item.id, type: 'ADJUSTMENT_OUT' },
    });
    expect(adjustment.quantity).toBe(30);
    expect(adjustment.createdBy).toBe(userId);
    await expectLedgerReconciled();
  });

  it('reconstructs stock across a long mixed history', async () => {
    const item = await seedItem(60);

    await addMovement(item.id, { type: 'OUT', quantity: 12 });
    await addMovement(item.id, { type: 'IN', quantity: 30 });
    await addMovement(item.id, { type: 'WASTE', quantity: 5 });
    await command.updateItem(clinicId, item.id, userId, { quantity: 74 });
    await addMovement(item.id, { type: 'EXPIRED', quantity: 4 });

    // 60 - 12 + 30 - 5 = 73, corrected to 74, then -4 expired = 70.
    expect(await quantityOf(item.id)).toBe(70);
    await expectLedgerReconciled();
  });

  it('lets a correction take stock to exactly zero and stay reconciled', async () => {
    const item = await seedItem(5);

    // A manual count that finds nothing left is a legitimate end state, and
    // the ledger has to agree.
    await command.updateItem(clinicId, item.id, userId, { quantity: 0 });

    expect(await quantityOf(item.id)).toBe(0);
    expect(await movementCount(item.id)).toBe(2); // INITIAL + ADJUSTMENT_OUT
    await expectLedgerReconciled();
  });

  it('cannot correct stock to a negative balance', async () => {
    const item = await seedItem(5);

    // The message matters: without the service-level guard the negative target
    // falls through to the movement path and is rejected there as insufficient
    // stock, which is a different failure with a different meaning.
    await expect(
      command.updateItem(clinicId, item.id, userId, { quantity: -1 }),
    ).rejects.toThrow('Quantity cannot be negative');

    expect(await quantityOf(item.id)).toBe(5);
    expect(await movementCount(item.id)).toBe(1);
    await expectLedgerReconciled();
  });

  it('records the item unit on each movement', async () => {
    const item = await seedItem(10, 'tablets');

    await addMovement(item.id, { type: 'OUT', quantity: 3 });

    const movement = await prisma.inventoryMovement.findFirstOrThrow({
      where: { inventoryItemId: item.id, type: 'OUT' },
    });
    expect(movement.unit).toBe('tablets');
  });

  it('refuses to re-unitise an item that has recorded movements', async () => {
    const item = await seedItem(10);
    await addMovement(item.id, { type: 'OUT', quantity: 2 });

    await expect(
      command.updateItem(clinicId, item.id, userId, { unit: 'capsules' }),
    ).rejects.toBeInstanceOf(ConflictException);

    const reloaded = await prisma.inventoryItem.findUniqueOrThrow({
      where: { id: item.id },
    });
    expect(reloaded.unit).toBe('tablets');
  });

  it('allows re-unitising an item with no history', async () => {
    const item = await seedItem(0);

    await command.updateItem(clinicId, item.id, userId, { unit: 'capsules' });

    const reloaded = await prisma.inventoryItem.findUniqueOrThrow({
      where: { id: item.id },
    });
    expect(reloaded.unit).toBe('capsules');
  });

  it('reports drift for an item edited outside the ledger', async () => {
    const item = await seedItem(20);

    // Simulates a historical row written before the ledger became
    // authoritative: a direct balance edit with no movement.
    await prisma.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: 35 },
    });

    expect(await repository.reconcileLedger(clinicId)).toEqual([
      {
        itemId: item.id,
        stockQuantity: 35,
        ledgerQuantity: 20,
        drift: 15,
      },
    ]);

    // Setting the item back to its stored 35 is a no-op by design, and a new
    // movement cannot close this gap either way: every movement also changes
    // stock, so an already-edited balance would double-count. Historical drift
    // is therefore closed by the migration's backfill, which writes ledger rows
    // without touching stock — the reconciler exists so any gap that does
    // appear is visible rather than silent.
    await command.updateItem(clinicId, item.id, userId, { quantity: 35 });
    expect((await repository.reconcileLedger(clinicId))[0].drift).toBe(15);
  });
});
