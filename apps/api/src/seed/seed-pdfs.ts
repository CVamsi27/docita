import { mkdir, writeFile } from 'fs/promises';
import * as path from 'path';
import { PrismaClient } from '@workspace/db';
import { getPatientFullName } from '@workspace/utils';
import { PrescriptionPdfService } from '@/domains/prescriptions/application/services/prescription-pdf.service';
import { SignatureImageClient } from '@/domains/prescriptions/infrastructure/external/signature-image.client';
import { PDFService } from '@/domains/billing/application/services/pdf.service';
import { SystemClockService } from '@/shared/modules/time/system-clock.service';
import {
  RAJESH_APPOINTMENT_ID,
  RAJESH_INVOICE_ID,
  RAJESH_PRESCRIPTION_ID,
} from './seed-patients-encounters';

const SEED_UPLOAD_ROOT = path.resolve(__dirname, '../../uploads/seed');
const PRESCRIPTION_DIR = path.join(SEED_UPLOAD_ROOT, 'prescriptions');
const INVOICE_DIR = path.join(SEED_UPLOAD_ROOT, 'invoices');

interface SeedPdfsParams {
  clinicId: string;
}

interface SeedInvoiceItem {
  description: string;
  quantity: number;
  price: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function isSeedInvoiceItem(value: unknown): value is SeedInvoiceItem {
  return (
    isRecord(value) &&
    typeof value.description === 'string' &&
    typeof value.quantity === 'number' &&
    typeof value.price === 'number'
  );
}

function parseSeedInvoiceItems(value: unknown): SeedInvoiceItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const items: SeedInvoiceItem[] = [];
  for (const item of value) {
    if (isSeedInvoiceItem(item)) {
      items.push({
        description: item.description,
        quantity: item.quantity,
        price: item.price,
      });
    }
  }
  return items;
}

function ageInYears(dob: Date): number {
  const diffMs = Date.now() - dob.getTime();
  return Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
}

export async function seedPdfs(
  prisma: PrismaClient,
  params: SeedPdfsParams,
): Promise<void> {
  const { clinicId } = params;

  const clock = new SystemClockService();
  const signatureClient = new SignatureImageClient();
  const prescriptionPdf = new PrescriptionPdfService(clock, signatureClient);
  const invoicePdf = new PDFService(clock);

  const [clinic, prescription, invoice] = await Promise.all([
    prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } }),
    prisma.prescription.findUnique({
      where: { id: RAJESH_PRESCRIPTION_ID },
      include: { medications: true, doctor: true, patient: true },
    }),
    prisma.invoice.findUnique({
      where: { id: RAJESH_INVOICE_ID },
      include: { patient: true },
    }),
  ]);

  if (!prescription || !invoice) {
    process.stderr.write(
      `seed-pdfs: skipping — prescription or invoice not found (rx=${!!prescription}, inv=${!!invoice})\n`,
    );
    return;
  }

  await Promise.all([
    mkdir(PRESCRIPTION_DIR, { recursive: true }),
    mkdir(INVOICE_DIR, { recursive: true }),
  ]);

  const clinicInfo = {
    name: clinic.name,
    address: clinic.address,
    phone: clinic.phone,
    email: clinic.email,
    currency: clinic.currency,
    country: 'IN',
  };

  // ─── Prescription PDF ────────────────────────────────────────────────
  const rxBuffer = await prescriptionPdf.generate({
    prescriptionId: prescription.id,
    clinic: clinicInfo,
    doctor: {
      name: `Dr. ${prescription.doctor.name}`,
      qualification: prescription.doctor.qualification ?? undefined,
      registrationNumber: prescription.doctor.registrationNumber ?? undefined,
      licenseNumber: prescription.doctor.licenseNumber ?? undefined,
      specialization: prescription.doctor.specialization ?? undefined,
    },
    patient: {
      name: getPatientFullName(prescription.patient),
      phoneNumber: prescription.patient.phoneNumber,
      email: prescription.patient.email ?? undefined,
      gender: prescription.patient.gender,
      age: ageInYears(prescription.patient.dateOfBirth),
      dateOfBirth: prescription.patient.dateOfBirth,
      bloodGroup: prescription.patient.bloodGroup ?? undefined,
      patientId: prescription.patient.id,
      allergies: prescription.patient.allergies
        ? [prescription.patient.allergies]
        : undefined,
    },
    medications: prescription.medications.map((m) => ({
      name: m.name,
      dosage: m.dosage,
      route: m.route,
      frequency: m.frequency,
      duration: m.duration,
    })),
    instructions: prescription.instructions ?? undefined,
    date: prescription.date,
    validityDays: 30,
  });
  const rxPath = path.join(PRESCRIPTION_DIR, `${prescription.id}.pdf`);
  await writeFile(rxPath, rxBuffer);
  const rxKey = `seed/prescriptions/${prescription.id}.pdf`;
  await prisma.prescription.update({
    where: { id: prescription.id },
    data: { pdfUrl: rxKey, pdfGeneratedAt: new Date() },
  });

  // ─── Invoice PDF ─────────────────────────────────────────────────────
  const invoiceItems = parseSeedInvoiceItems(invoice.items);

  const invBuffer = await invoicePdf.generate({
    invoiceId: invoice.invoiceNumber ?? invoice.id,
    clinic: clinicInfo,
    patient: {
      name: getPatientFullName(invoice.patient),
      phoneNumber: invoice.patient.phoneNumber,
      email: invoice.patient.email ?? undefined,
      gender: invoice.patient.gender,
      age: ageInYears(invoice.patient.dateOfBirth),
      patientId: invoice.patient.id,
    },
    items: invoiceItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.price,
      amount: item.quantity * item.price,
    })),
    date: invoice.createdAt,
    status: invoice.status,
  });
  const invPath = path.join(INVOICE_DIR, `${invoice.id}.pdf`);
  await writeFile(invPath, invBuffer);
  const invKey = `seed/invoices/${invoice.id}.pdf`;
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { pdfUrl: invKey, pdfGeneratedAt: new Date() },
  });

  process.stdout.write(
    `seed-pdfs: wrote ${rxPath} and ${invPath}\n` +
      `seed-pdfs: appointmentId=${RAJESH_APPOINTMENT_ID}\n`,
  );
}
