import { AppointmentStatus, InvoiceStatus, PrismaClient } from '@workspace/db';

type SeedEntityRef = { id: string };

interface SeedPatientsAndEncountersParams {
  clinicId: string;
  doctor1Id: string;
  doctor2Id: string;
}

export async function seedPatientsAndEncounters(
  prisma: PrismaClient,
  params: SeedPatientsAndEncountersParams,
): Promise<SeedEntityRef[]> {
  const { clinicId, doctor1Id, doctor2Id } = params;

  const patients = await Promise.all([
    prisma.patient.create({
      data: {
        firstName: 'Rajesh',
        lastName: 'Kumar',
        dateOfBirth: new Date('1985-03-15'),
        gender: 'MALE',
        bloodGroup: 'O+',
        allergies: 'Penicillin',
        phoneNumber: '9876543210',
        email: 'rajesh.kumar@docita.work',
        address: '123 MG Road, Bangalore',
        medicalHistory: ['Hypertension', 'Diabetes Type 2'],
        clinicId,
      },
    }),
    prisma.patient.create({
      data: {
        firstName: 'Priya',
        lastName: 'Nair',
        dateOfBirth: new Date('1990-07-22'),
        gender: 'FEMALE',
        bloodGroup: 'A+',
        allergies: null,
        phoneNumber: '9876543211',
        email: 'priya.nair@docita.work',
        address: '456 Brigade Road, Bangalore',
        medicalHistory: ['Asthma'],
        clinicId,
      },
    }),
    prisma.patient.create({
      data: {
        firstName: 'Amit',
        lastName: 'Patel',
        dateOfBirth: new Date('1978-11-30'),
        gender: 'MALE',
        bloodGroup: 'B+',
        allergies: 'Sulfa drugs',
        phoneNumber: '9876543212',
        email: 'amit.patel@docita.work',
        address: '789 Residency Road, Bangalore',
        medicalHistory: ['Arthritis'],
        clinicId,
      },
    }),
    prisma.patient.create({
      data: {
        firstName: 'Lakshmi',
        lastName: 'Iyer',
        dateOfBirth: new Date('1995-05-18'),
        gender: 'FEMALE',
        bloodGroup: 'AB+',
        allergies: null,
        phoneNumber: '9876543213',
        email: 'lakshmi.iyer@docita.work',
        address: '321 Indiranagar, Bangalore',
        medicalHistory: [],
        clinicId,
      },
    }),
    prisma.patient.create({
      data: {
        firstName: 'Suresh',
        lastName: 'Reddy',
        dateOfBirth: new Date('1982-09-10'),
        gender: 'MALE',
        bloodGroup: 'O-',
        allergies: 'Latex',
        phoneNumber: '9876543214',
        email: 'suresh.reddy@docita.work',
        address: '654 Koramangala, Bangalore',
        medicalHistory: ['Migraine'],
        clinicId,
      },
    }),
  ]);

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const apt1 = await prisma.appointment.create({
    data: {
      patientId: patients[0].id,
      doctorId: doctor1Id,
      clinicId,
      startTime: new Date(today.setHours(9, 0, 0, 0)),
      endTime: new Date(today.setHours(9, 30, 0, 0)),
      status: AppointmentStatus.COMPLETED,
      type: 'consultation',
      notes: 'Regular checkup for diabetes management',
    },
  });

  await prisma.vitalSign.create({
    data: {
      appointmentId: apt1.id,
      height: 175,
      weight: 78,
      bloodPressure: '140/90',
      pulse: 78,
      temperature: 98.6,
      spo2: 97,
    },
  });

  await prisma.prescription.create({
    data: {
      appointmentId: apt1.id,
      patientId: patients[0].id,
      doctorId: doctor1Id,
      instructions:
        'Take medications as prescribed. Follow low-sugar diet. Exercise 30 mins daily.',
      medications: {
        create: [
          {
            name: 'Metformin',
            dosage: '500mg',
            frequency: 'Twice daily',
            duration: '30 days',
          },
          {
            name: 'Amlodipine',
            dosage: '5mg',
            frequency: 'Once daily',
            duration: '30 days',
          },
        ],
      },
    },
  });

  await prisma.invoice.create({
    data: {
      appointmentId: apt1.id,
      patientId: patients[0].id,
      total: 1500,
      status: InvoiceStatus.PAID,
      items: [
        { description: 'Consultation Fee', quantity: 1, price: 800 },
        { description: 'Prescription', quantity: 1, price: 200 },
        { description: 'Vitals Check', quantity: 1, price: 500 },
      ],
    },
  });

  await prisma.appointment.create({
    data: {
      patientId: patients[1].id,
      doctorId: doctor2Id,
      clinicId,
      startTime: new Date(tomorrow.setHours(10, 0, 0, 0)),
      endTime: new Date(tomorrow.setHours(10, 30, 0, 0)),
      status: AppointmentStatus.CONFIRMED,
      type: 'follow-up',
      notes: 'Follow-up for asthma treatment',
    },
  });

  await prisma.appointment.create({
    data: {
      patientId: patients[2].id,
      doctorId: doctor1Id,
      clinicId,
      startTime: new Date(nextWeek.setHours(14, 0, 0, 0)),
      endTime: new Date(nextWeek.setHours(14, 30, 0, 0)),
      status: AppointmentStatus.SCHEDULED,
      type: 'check-up',
      notes: 'Arthritis pain assessment',
    },
  });

  await prisma.appointment.create({
    data: {
      patientId: patients[3].id,
      doctorId: doctor2Id,
      clinicId,
      startTime: new Date(new Date().setHours(15, 0, 0, 0)),
      endTime: new Date(new Date().setHours(15, 30, 0, 0)),
      status: AppointmentStatus.CONFIRMED,
      type: 'consultation',
      notes: 'First visit - general health checkup',
    },
  });

  await prisma.appointment.create({
    data: {
      patientId: patients[4].id,
      doctorId: doctor1Id,
      clinicId,
      startTime: new Date(new Date(tomorrow).setHours(11, 0, 0, 0)),
      endTime: new Date(new Date(tomorrow).setHours(11, 30, 0, 0)),
      status: AppointmentStatus.SCHEDULED,
      type: 'consultation',
      notes: 'Migraine consultation',
    },
  });

  await prisma.document.create({
    data: {
      patientId: patients[0].id,
      name: 'Blood Test Report - Jan 2025',
      type: 'LAB_REPORT',
      url: '/uploads/documents/blood-test-rajesh-jan2025.pdf',
    },
  });

  await prisma.document.create({
    data: {
      patientId: patients[1].id,
      name: 'X-Ray Chest - Dec 2024',
      type: 'XRAY',
      url: '/uploads/documents/xray-priya-dec2024.pdf',
    },
  });

  return patients.map((patient) => ({ id: patient.id }));
}
