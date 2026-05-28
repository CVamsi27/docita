import { PrismaClient } from '@workspace/db';

interface SeedInventoryParams {
  clinicId: string;
  createdByUserId: string;
}

interface SeedInventoryItem {
  id: string;
  name: string;
  category: string;
  sku: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  supplier: string;
}

const ITEMS: SeedInventoryItem[] = [
  {
    id: 'seed-inv-paracetamol',
    name: 'Paracetamol 500mg',
    category: 'MEDICINE',
    sku: 'MED-PCM-500',
    quantity: 480,
    minQuantity: 100,
    unit: 'tablets',
    purchasePrice: 0.5,
    sellingPrice: 1.2,
    supplier: 'Cipla',
  },
  {
    id: 'seed-inv-metformin',
    name: 'Metformin 500mg',
    category: 'MEDICINE',
    sku: 'MED-MET-500',
    quantity: 320,
    minQuantity: 100,
    unit: 'tablets',
    purchasePrice: 0.8,
    sellingPrice: 1.6,
    supplier: 'Sun Pharma',
  },
  {
    id: 'seed-inv-amlodipine',
    name: 'Amlodipine 5mg',
    category: 'MEDICINE',
    sku: 'MED-AML-5',
    quantity: 240,
    minQuantity: 80,
    unit: 'tablets',
    purchasePrice: 1.0,
    sellingPrice: 2.0,
    supplier: 'Sun Pharma',
  },
  {
    id: 'seed-inv-azithromycin',
    name: 'Azithromycin 500mg',
    category: 'MEDICINE',
    sku: 'MED-AZI-500',
    quantity: 150,
    minQuantity: 50,
    unit: 'tablets',
    purchasePrice: 4.0,
    sellingPrice: 8.0,
    supplier: 'Cipla',
  },
  {
    id: 'seed-inv-atorvastatin',
    name: 'Atorvastatin 10mg',
    category: 'MEDICINE',
    sku: 'MED-ATO-10',
    quantity: 200,
    minQuantity: 80,
    unit: 'tablets',
    purchasePrice: 2.0,
    sellingPrice: 4.0,
    supplier: 'Dr. Reddys',
  },
  {
    id: 'seed-inv-salbutamol',
    name: 'Salbutamol Inhaler 100mcg',
    category: 'MEDICINE',
    sku: 'MED-SAL-INH',
    quantity: 35,
    minQuantity: 10,
    unit: 'units',
    purchasePrice: 120,
    sellingPrice: 180,
    supplier: 'Cipla',
  },
  {
    id: 'seed-inv-pantoprazole',
    name: 'Pantoprazole 40mg',
    category: 'MEDICINE',
    sku: 'MED-PAN-40',
    quantity: 180,
    minQuantity: 60,
    unit: 'tablets',
    purchasePrice: 1.5,
    sellingPrice: 3.0,
    supplier: 'Sun Pharma',
  },
  {
    id: 'seed-inv-gloves',
    name: 'Latex Examination Gloves (M)',
    category: 'CONSUMABLE',
    sku: 'CON-GLV-M',
    quantity: 1200,
    minQuantity: 500,
    unit: 'pairs',
    purchasePrice: 3.0,
    sellingPrice: 0,
    supplier: 'Romsons',
  },
  {
    id: 'seed-inv-syringes',
    name: 'Disposable Syringe 5ml',
    category: 'CONSUMABLE',
    sku: 'CON-SYR-5',
    quantity: 800,
    minQuantity: 300,
    unit: 'units',
    purchasePrice: 2.0,
    sellingPrice: 0,
    supplier: 'BD',
  },
  {
    id: 'seed-inv-masks',
    name: 'Surgical Mask 3-ply',
    category: 'CONSUMABLE',
    sku: 'CON-MSK-3PLY',
    quantity: 2500,
    minQuantity: 800,
    unit: 'units',
    purchasePrice: 1.0,
    sellingPrice: 5.0,
    supplier: 'Romsons',
  },
  {
    id: 'seed-inv-cotton',
    name: 'Absorbent Cotton 500g',
    category: 'CONSUMABLE',
    sku: 'CON-COT-500',
    quantity: 60,
    minQuantity: 20,
    unit: 'rolls',
    purchasePrice: 80,
    sellingPrice: 120,
    supplier: 'Bombay Cotton',
  },
  {
    id: 'seed-inv-bandage',
    name: 'Crepe Bandage 4 inch',
    category: 'CONSUMABLE',
    sku: 'CON-BAN-4',
    quantity: 95,
    minQuantity: 30,
    unit: 'rolls',
    purchasePrice: 35,
    sellingPrice: 60,
    supplier: 'Romsons',
  },
];

function dateOffset(days: number): Date {
  const d = new Date();
  d.setHours(10, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

export async function seedInventory(
  prisma: PrismaClient,
  params: SeedInventoryParams,
): Promise<void> {
  const { clinicId, createdByUserId } = params;

  for (const item of ITEMS) {
    const data = {
      clinicId,
      name: item.name,
      category: item.category,
      sku: item.sku,
      quantity: item.quantity,
      minQuantity: item.minQuantity,
      unit: item.unit,
      purchasePrice: item.purchasePrice,
      sellingPrice: item.sellingPrice,
      supplier: item.supplier,
      active: true,
    };
    await prisma.inventoryItem.upsert({
      where: { id: item.id },
      update: data,
      create: { id: item.id, ...data },
    });
  }

  // Wipe and re-seed movements so re-runs are idempotent.
  await prisma.inventoryMovement.deleteMany({
    where: { inventoryItemId: { in: ITEMS.map((i) => i.id) } },
  });

  const movements: Array<{
    inventoryItemId: string;
    type: string;
    quantity: number;
    daysOffset: number;
    notes: string;
  }> = [];

  ITEMS.forEach((item, idx) => {
    // One stock receipt 25 days ago.
    movements.push({
      inventoryItemId: item.id,
      type: 'IN',
      quantity: Math.round(item.quantity * 0.4),
      daysOffset: -25,
      notes: `Stock receipt from ${item.supplier}`,
    });
    // One dispense in the last week.
    movements.push({
      inventoryItemId: item.id,
      type: 'OUT',
      quantity: Math.max(2, Math.round(item.quantity * 0.05)),
      daysOffset: -(3 + (idx % 5)),
      notes: 'Dispensed at OPD',
    });
  });

  await prisma.inventoryMovement.createMany({
    data: movements.map((m) => ({
      inventoryItemId: m.inventoryItemId,
      clinicId,
      type: m.type,
      quantity: m.quantity,
      notes: m.notes,
      createdBy: createdByUserId,
      createdAt: dateOffset(m.daysOffset),
    })),
  });
}
