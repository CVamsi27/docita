import { PrismaClient, AppointmentStatus, InvoiceStatus } from '@workspace/db';
import * as bcrypt from 'bcrypt';

let prisma: PrismaClient;

function normalizeRole(role: unknown): string {
  if (role === 'STAFF') {
    return 'RECEPTIONIST';
  }

  return typeof role === 'string' ? role : 'DOCTOR';
}

function normalizeClinicTier(tier: unknown): string {
  switch (tier) {
    case 'CAPTURE':
      return 'STARTER';
    case 'CORE':
    case 'PLUS':
      return 'ESSENTIAL';
    case 'PRO':
    case 'CLINIC':
      return 'PROFESSIONAL';
    case 'ENTERPRISE':
    case 'STARTER':
    case 'ESSENTIAL':
    case 'PROFESSIONAL':
      return tier;
    default:
      return 'ESSENTIAL';
  }
}

export function setPrismaInstance(client: PrismaClient) {
  prisma = client;
}

export const factories = {
  user: async (overrides = {}) => {
    const userOverrides = overrides as Record<string, unknown>;
    const email = `user${Date.now()}${Math.random().toString().slice(2, 5)}@test.com`;
    const password = 'Test@123456';
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name: 'Test Doctor',
        password: hashedPassword,
        ...userOverrides,
        role: normalizeRole(userOverrides.role),
      },
    });

    return { user, plainPassword: password };
  },

  clinic: async (overrides = {}) => {
    const clinicOverrides = overrides as Record<string, unknown>;
    return prisma.clinic.create({
      data: {
        name: `Clinic ${Date.now()}`,
        address: '123 Main St',
        phone: `987654${String(Date.now()).slice(-4)}`,
        email: `clinic${Date.now()}@test.com`,
        type: 'GENERAL',
        ...clinicOverrides,
        tier: normalizeClinicTier(clinicOverrides.tier),
      },
    });
  },

  patient: async (
    clinicIdOrArgs: string | { clinicId: string },
    overrides = {},
  ) => {
    const resolvedClinicId =
      typeof clinicIdOrArgs === 'string'
        ? clinicIdOrArgs
        : clinicIdOrArgs.clinicId;
    const patientOverrides = overrides as Record<string, unknown>;
    return prisma.patient.create({
      data: {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: `9876543${String(Date.now()).slice(-3)}`,
        email: `patient${Date.now()}@test.com`,
        gender: 'MALE',
        dateOfBirth: new Date('1990-01-01'),
        ...patientOverrides,
        clinicId: resolvedClinicId,
      },
    });
  },

  appointment: async (
    patientId: string,
    doctorId: string,
    clinicId: string,
    overrides = {},
  ) => {
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 1);

    return prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        clinicId,
        startTime,
        endTime: new Date(startTime.getTime() + 30 * 60000),
        type: 'consultation',
        status: AppointmentStatus.SCHEDULED,
        ...overrides,
      },
    });
  },

  doctorClinic: async (doctorId: string, clinicId: string) => {
    return prisma.doctorClinic.create({
      data: {
        doctorId,
        clinicId,
        role: 'doctor',
        active: true,
      },
    });
  },

  invoice: async (patientId: string, overrides = {}) => {
    return prisma.invoice.create({
      data: {
        patientId,
        total: 100,
        status: InvoiceStatus.PENDING,
        items: [{ description: 'Consultation', amount: 100 }],
        ...overrides,
      },
    });
  },

  whatsappLog: async (
    clinicId: string,
    phoneNumber: string,
    overrides = {},
  ) => {
    return prisma.whatsappLog.create({
      data: {
        clinicId,
        phoneNumber,
        type: 'reminder',
        message: 'Test WhatsApp message',
        ...overrides,
      },
    });
  },

  prescription: async (
    appointmentId: string,
    patientId: string,
    doctorId: string,
    overrides = {},
  ) => {
    return prisma.prescription.create({
      data: {
        appointmentId,
        patientId,
        doctorId,
        ...overrides,
      },
    });
  },

  appointmentReminder: async (
    appointmentId: string,
    clinicId: string,
    overrides = {},
  ) => {
    const scheduledFor = new Date();
    scheduledFor.setHours(scheduledFor.getHours() + 1);
    return prisma.appointmentReminder.create({
      data: {
        appointmentId,
        clinicId,
        type: 'whatsapp',
        status: 'pending',
        scheduledFor,
        ...overrides,
      },
    });
  },
};
