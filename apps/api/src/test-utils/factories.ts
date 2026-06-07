import { faker } from '@faker-js/faker';
import type { InventoryItem } from '@/domains/inventory/core/entities/inventory-item.entity';

export function createMockPatient(
  overrides?: Partial<{
    id: string;
    clinicId: string;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
    email: string | null;
    mrn: string | null;
    dateOfBirth: Date | null;
    gender: string | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>,
): {
  id: string;
  clinicId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  email: string | null;
  mrn: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
} {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  return {
    id: faker.string.alphanumeric(24),
    clinicId: faker.string.alphanumeric(24),
    firstName,
    lastName,
    phoneNumber: faker.phone.number(),
    email: faker.internet.email({ firstName, lastName }),
    mrn: faker.string.alphanumeric(8).toUpperCase(),
    dateOfBirth: faker.date.birthdate({ min: 18, max: 90, mode: 'age' }),
    gender: faker.helpers.arrayElement(['MALE', 'FEMALE', 'OTHER']),
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockDoctor(
  overrides?: Partial<{
    id: string;
    clinicId: string;
    name: string;
    email: string;
    phoneNumber: string | null;
    role: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>,
): {
  id: string;
  clinicId: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
} {
  const name = faker.person.fullName();
  return {
    id: faker.string.alphanumeric(24),
    clinicId: faker.string.alphanumeric(24),
    name,
    email: faker.internet.email({ firstName: name.split(' ')[0] }),
    phoneNumber: faker.phone.number(),
    role: 'DOCTOR',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockAppointment(
  overrides?: Partial<{
    id: string;
    clinicId: string;
    patientId: string;
    doctorId: string;
    startTime: Date;
    endTime: Date;
    status: string;
    type: string;
    notes: string | null;
    chiefComplaint: string | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }>,
): {
  id: string;
  clinicId: string;
  patientId: string;
  doctorId: string;
  startTime: Date;
  endTime: Date;
  status: string;
  type: string;
  notes: string | null;
  chiefComplaint: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
} {
  const startTime = faker.date.soon({ days: 30 });
  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
  return {
    id: faker.string.alphanumeric(24),
    clinicId: faker.string.alphanumeric(24),
    patientId: faker.string.alphanumeric(24),
    doctorId: faker.string.alphanumeric(24),
    startTime,
    endTime,
    status: 'SCHEDULED',
    type: 'CLINIC_VISIT',
    notes: faker.helpers.maybe(() => faker.lorem.sentence()) ?? null,
    chiefComplaint: faker.helpers.maybe(() => faker.lorem.sentence()) ?? null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockInvoice(
  overrides?: Partial<{
    id: string;
    clinicId: string;
    patientId: string;
    invoiceNumber: string;
    status: string;
    subtotal: number;
    tax: number;
    total: number;
    paidAmount: number;
    dueDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>,
): {
  id: string;
  clinicId: string;
  patientId: string;
  invoiceNumber: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  paidAmount: number;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
} {
  const subtotal = faker.number.int({ min: 500, max: 5000 });
  const tax = Math.round(subtotal * 0.18);
  return {
    id: faker.string.alphanumeric(24),
    clinicId: faker.string.alphanumeric(24),
    patientId: faker.string.alphanumeric(24),
    invoiceNumber: `INV-${faker.string.alphanumeric(8).toUpperCase()}`,
    status: 'PENDING',
    subtotal,
    tax,
    total: subtotal + tax,
    paidAmount: 0,
    dueDate: faker.date.soon({ days: 15 }),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockInventoryItem(
  overrides?: Partial<InventoryItem>,
): InventoryItem {
  return {
    id: faker.string.alphanumeric(24),
    clinicId: faker.string.alphanumeric(24),
    name: faker.commerce.productName(),
    category: faker.helpers.arrayElement([
      'MEDICINE',
      'EQUIPMENT',
      'SUPPLIES',
      'CONSUMABLES',
    ]),
    sku:
      faker.helpers.maybe(() => faker.string.alphanumeric(10).toUpperCase()) ??
      null,
    quantity: faker.number.int({ min: 10, max: 500 }),
    minQuantity: 10,
    unit: 'units',
    purchasePrice:
      faker.helpers.maybe(() => faker.number.int({ min: 10, max: 1000 })) ??
      null,
    sellingPrice:
      faker.helpers.maybe(() => faker.number.int({ min: 20, max: 2000 })) ??
      null,
    expiryDate:
      faker.helpers.maybe(() => faker.date.soon({ days: 365 })) ?? null,
    batchNumber:
      faker.helpers.maybe(() => faker.string.alphanumeric(8).toUpperCase()) ??
      null,
    supplier: faker.helpers.maybe(() => faker.company.name()) ?? null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
