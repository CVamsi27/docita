import { PrismaClient } from '@workspace/db';
import * as bcrypt from 'bcrypt';

let prisma: PrismaClient;

export function setPrismaInstance(client: PrismaClient) {
  prisma = client;
}

export const factories = {
  user: async (overrides = {}) => {
    const email = `user${Date.now()}${Math.random().toString().slice(2, 5)}@test.com`;
    const password = 'Test@123456';
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name: 'Test Doctor',
        password: hashedPassword,
        role: 'DOCTOR',
        ...overrides,
      },
    });

    return { user, plainPassword: password };
  },

  clinic: async (overrides = {}) => {
    return prisma.clinic.create({
      data: {
        name: `Clinic ${Date.now()}`,
        address: '123 Main St',
        phone: `987654${String(Date.now()).slice(-4)}`,
        email: `clinic${Date.now()}@test.com`,
        tier: 'CORE',
        type: 'GENERAL',
        ...overrides,
      },
    });
  },

  patient: async (clinicId: string, overrides = {}) => {
    return prisma.patient.create({
      data: {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: `9876543${String(Date.now()).slice(-3)}`,
        email: `patient${Date.now()}@test.com`,
        gender: 'MALE',
        dateOfBirth: new Date('1990-01-01'),
        clinicId,
        ...overrides,
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
        status: 'scheduled',
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
};
