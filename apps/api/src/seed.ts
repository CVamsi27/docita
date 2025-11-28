import { PrismaClient } from '@workspace/db';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('🌱 Starting database seed...');
    console.log(
      'Using Database URL:',
      process.env.DATABASE_URL
        ? process.env.DATABASE_URL.substring(0, 20) + '...'
        : 'UNDEFINED',
    );

    // Create default clinic
    const defaultClinic = await prisma.clinic.upsert({
      where: { id: 'default-clinic-id' },
      update: {},
      create: {
        id: 'default-clinic-id',
        name: 'Docita Health Clinic',
        address: '123 Health Street, Bangalore, Karnataka 560001',
        phone: '+91 80 1234 5678',
        email: 'contact@docita.health',
        active: true,
        tier: 'PROFESSIONAL',
        settings: {
          timezone: 'Asia/Kolkata',
          currency: 'INR',
        },
      },
    });

    console.log('✅ Default clinic created');

    // Create users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Super Admin (no clinic association)
    await prisma.user.upsert({
      where: { email: 'admin@docita.com' },
      update: {},
      create: {
        email: 'admin@docita.com',
        password: hashedPassword,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        clinicId: null, // Super admin not tied to any clinic
      },
    });

    // Clinic Admin
    await prisma.user.upsert({
      where: { email: 'clinic.admin@docita.com' },
      update: {},
      create: {
        email: 'clinic.admin@docita.com',
        password: hashedPassword,
        name: 'Clinic Administrator',
        role: 'ADMIN',
        clinicId: defaultClinic.id,
      },
    });

    const doctor1 = await prisma.user.upsert({
      where: { email: 'doctor@docita.com' },
      update: {},
      create: {
        email: 'doctor@docita.com',
        password: hashedPassword,
        name: 'Dr. Vamsi Krishna',
        role: 'DOCTOR',
        clinicId: defaultClinic.id,
      },
    });

    const doctor2 = await prisma.user.upsert({
      where: { email: 'dr.sharma@docita.com' },
      update: {},
      create: {
        email: 'dr.sharma@docita.com',
        password: hashedPassword,
        name: 'Dr. Priya Sharma',
        role: 'DOCTOR',
        clinicId: defaultClinic.id,
      },
    });

    await prisma.user.upsert({
      where: { email: 'reception@docita.com' },
      update: {},
      create: {
        email: 'reception@docita.com',
        password: hashedPassword,
        name: 'Anjali Reddy',
        role: 'RECEPTIONIST',
        clinicId: defaultClinic.id,
      },
    });

    console.log('✅ Users created (including Super Admin)');

    // Create patients
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
          email: 'rajesh.kumar@email.com',
          address: '123 MG Road, Bangalore',
          medicalHistory: ['Hypertension', 'Diabetes Type 2'],
          clinicId: defaultClinic.id,
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
          email: 'priya.nair@email.com',
          address: '456 Brigade Road, Bangalore',
          medicalHistory: ['Asthma'],
          clinicId: defaultClinic.id,
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
          email: 'amit.patel@email.com',
          address: '789 Residency Road, Bangalore',
          medicalHistory: ['Arthritis'],
          clinicId: defaultClinic.id,
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
          email: 'lakshmi.iyer@email.com',
          address: '321 Indiranagar, Bangalore',
          medicalHistory: [],
          clinicId: defaultClinic.id,
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
          email: 'suresh.reddy@email.com',
          address: '654 Koramangala, Bangalore',
          medicalHistory: ['Migraine'],
          clinicId: defaultClinic.id,
        },
      }),
    ]);

    console.log('✅ Patients created');

    // Create appointments with vitals and prescriptions
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Appointment 1 - Completed with prescription
    const apt1 = await prisma.appointment.create({
      data: {
        patientId: patients[0].id,
        doctorId: doctor1.id,
        clinicId: defaultClinic.id,
        startTime: new Date(today.setHours(9, 0, 0, 0)),
        endTime: new Date(today.setHours(9, 30, 0, 0)),
        status: 'completed',
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
        doctorId: doctor1.id,
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
        status: 'paid',
        items: [
          { description: 'Consultation Fee', quantity: 1, price: 800 },
          { description: 'Prescription', quantity: 1, price: 200 },
          { description: 'Vitals Check', quantity: 1, price: 500 },
        ],
      },
    });

    // Appointment 2 - Confirmed for tomorrow
    await prisma.appointment.create({
      data: {
        patientId: patients[1].id,
        doctorId: doctor2.id,
        clinicId: defaultClinic.id,
        startTime: new Date(tomorrow.setHours(10, 0, 0, 0)),
        endTime: new Date(tomorrow.setHours(10, 30, 0, 0)),
        status: 'confirmed',
        type: 'follow-up',
        notes: 'Follow-up for asthma treatment',
      },
    });

    // Appointment 3 - Scheduled for next week
    await prisma.appointment.create({
      data: {
        patientId: patients[2].id,
        doctorId: doctor1.id,
        clinicId: defaultClinic.id,
        startTime: new Date(nextWeek.setHours(14, 0, 0, 0)),
        endTime: new Date(nextWeek.setHours(14, 30, 0, 0)),
        status: 'scheduled',
        type: 'check-up',
        notes: 'Arthritis pain assessment',
      },
    });

    // Appointment 4 - Today afternoon
    await prisma.appointment.create({
      data: {
        patientId: patients[3].id,
        doctorId: doctor2.id,
        clinicId: defaultClinic.id,
        startTime: new Date(new Date().setHours(15, 0, 0, 0)),
        endTime: new Date(new Date().setHours(15, 30, 0, 0)),
        status: 'confirmed',
        type: 'consultation',
        notes: 'First visit - general health checkup',
      },
    });

    // Appointment 5 - Tomorrow morning
    await prisma.appointment.create({
      data: {
        patientId: patients[4].id,
        doctorId: doctor1.id,
        clinicId: defaultClinic.id,
        startTime: new Date(new Date(tomorrow).setHours(11, 0, 0, 0)),
        endTime: new Date(new Date(tomorrow).setHours(11, 30, 0, 0)),
        status: 'scheduled',
        type: 'consultation',
        notes: 'Migraine consultation',
      },
    });

    console.log('✅ Appointments, vitals, prescriptions, and invoices created');

    // Create sample documents
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

    console.log('✅ Documents created');

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Clinic: 1 (Docita Health Clinic - PROFESSIONAL tier)`);
    console.log(
      `   - Users: 5 (1 super admin, 1 clinic admin, 2 doctors, 1 receptionist)`,
    );
    console.log(`   - Patients: ${patients.length}`);
    console.log(`   - Appointments: 5`);
    console.log(`   - Prescriptions: 1`);
    console.log(`   - Invoices: 1`);
    console.log(`   - Documents: 2`);
    console.log('\n🔑 Login credentials:');
    console.log('\n   📱 Main App (http://localhost:3000):');
    console.log('   - clinic.admin@docita.com / password123 (Clinic Admin)');
    console.log('   - doctor@docita.com / password123 (Doctor)');
    console.log('   - dr.sharma@docita.com / password123 (Doctor)');
    console.log('   - reception@docita.com / password123 (Receptionist)');
    console.log('\n   👨‍💼 Admin Console (http://localhost:3002):');
    console.log('   - admin@docita.com / password123 (Super Admin)');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
