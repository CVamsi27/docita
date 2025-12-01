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
        tier: 'PRO',
      },
    });

    console.log('✅ Default clinic created');

    const hashedPassword = await bcrypt.hash('password123', 10);

    await prisma.user.upsert({
      where: { email: 'admin@docita.com' },
      update: {},
      create: {
        email: 'admin@docita.com',
        password: hashedPassword,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        clinicId: null,
      },
    });

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
        name: 'Vamsi Krishna',
        role: 'DOCTOR',
        clinicId: defaultClinic.id,
        specialization: 'CARDIOLOGY',
        hospitalRole: 'SENIOR_CONSULTANT',
        qualification: 'MBBS, MD (Cardiology)',
        registrationNumber: 'KMC-2015-12345',
        licenseNumber: 'KA-MED-2015-001234',
        phoneNumber: '+91 9876543001',
        bio: 'Senior Cardiologist with over 10 years of experience in interventional cardiology. Specializes in complex cardiac procedures and heart failure management.',
        yearsOfExperience: 10,
        consultationFee: 1500,
      },
    });

    const doctor2 = await prisma.user.upsert({
      where: { email: 'dr.sharma@docita.com' },
      update: {},
      create: {
        email: 'dr.sharma@docita.com',
        password: hashedPassword,
        name: 'Priya Sharma',
        role: 'DOCTOR',
        clinicId: defaultClinic.id,
        specialization: 'PEDIATRICS',
        hospitalRole: 'CONSULTANT',
        qualification: 'MBBS, DCH, MD (Pediatrics)',
        registrationNumber: 'KMC-2018-54321',
        licenseNumber: 'KA-MED-2018-005678',
        phoneNumber: '+91 9876543002',
        bio: 'Pediatrician specializing in newborn care, childhood vaccinations, and developmental pediatrics. Committed to providing compassionate care for children.',
        yearsOfExperience: 6,
        consultationFee: 1000,
      },
    });

    const doctor3 = await prisma.user.upsert({
      where: { email: 'dr.dental@docita.com' },
      update: {},
      create: {
        email: 'dr.dental@docita.com',
        password: hashedPassword,
        name: 'Arun Menon',
        role: 'DOCTOR',
        clinicId: defaultClinic.id,
        specialization: 'DENTAL',
        hospitalRole: 'CONSULTANT',
        qualification: 'BDS, MDS (Orthodontics)',
        registrationNumber: 'KDC-2016-67890',
        licenseNumber: 'KA-DEN-2016-002345',
        phoneNumber: '+91 9876543003',
        bio: 'Dental specialist with expertise in orthodontics, dental implants, and cosmetic dentistry. Uses latest technology for painless treatments.',
        yearsOfExperience: 8,
        consultationFee: 800,
      },
    });

    // Add education history for doctors - delete existing first
    await prisma.doctorEducation.deleteMany({
      where: { doctorId: { in: [doctor1.id, doctor2.id, doctor3.id] } },
    });

    await prisma.doctorEducation.createMany({
      data: [
        // Dr. Vamsi Krishna (Cardiologist)
        {
          doctorId: doctor1.id,
          degree: 'MBBS',
          fieldOfStudy: 'Medicine',
          institution: 'Bangalore Medical College',
          location: 'Bangalore, India',
          startYear: 2005,
          endYear: 2010,
          order: 1,
        },
        {
          doctorId: doctor1.id,
          degree: 'MD',
          fieldOfStudy: 'Cardiology',
          institution: 'AIIMS Delhi',
          location: 'New Delhi, India',
          startYear: 2011,
          endYear: 2014,
          order: 2,
        },
        {
          doctorId: doctor1.id,
          degree: 'DM',
          fieldOfStudy: 'Interventional Cardiology',
          institution: 'SCTIMST Trivandrum',
          location: 'Kerala, India',
          startYear: 2014,
          endYear: 2017,
          order: 3,
        },
        // Dr. Priya Sharma (Pediatrician)
        {
          doctorId: doctor2.id,
          degree: 'MBBS',
          fieldOfStudy: 'Medicine',
          institution: 'St. Johns Medical College',
          location: 'Bangalore, India',
          startYear: 2012,
          endYear: 2017,
          order: 1,
        },
        {
          doctorId: doctor2.id,
          degree: 'DCH',
          fieldOfStudy: 'Child Health',
          institution: 'Indira Gandhi Medical College',
          location: 'Shimla, India',
          startYear: 2017,
          endYear: 2019,
          order: 2,
        },
        {
          doctorId: doctor2.id,
          degree: 'MD',
          fieldOfStudy: 'Pediatrics',
          institution: 'Manipal Academy of Higher Education',
          location: 'Manipal, India',
          startYear: 2019,
          endYear: 2022,
          order: 3,
        },
        // Dr. Arun Menon (Dentist)
        {
          doctorId: doctor3.id,
          degree: 'BDS',
          fieldOfStudy: 'Dental Surgery',
          institution: 'SDM College of Dental Sciences',
          location: 'Dharwad, India',
          startYear: 2008,
          endYear: 2013,
          order: 1,
        },
        {
          doctorId: doctor3.id,
          degree: 'MDS',
          fieldOfStudy: 'Orthodontics & Dentofacial Orthopedics',
          institution: 'MCODS Manipal',
          location: 'Manipal, India',
          startYear: 2014,
          endYear: 2017,
          order: 2,
        },
      ],
    });

    // Add certifications - delete existing first
    await prisma.doctorCertification.deleteMany({
      where: { doctorId: { in: [doctor1.id, doctor2.id, doctor3.id] } },
    });

    await prisma.doctorCertification.createMany({
      data: [
        {
          doctorId: doctor1.id,
          name: 'Advanced Cardiac Life Support (ACLS)',
          issuingBody: 'American Heart Association',
          issueDate: new Date('2020-03-15'),
          expiryDate: new Date('2025-03-15'),
          credentialId: 'AHA-ACLS-2020-123456',
        },
        {
          doctorId: doctor1.id,
          name: 'Fellowship in Interventional Cardiology',
          issuingBody: 'Cardiological Society of India',
          issueDate: new Date('2018-06-20'),
          credentialId: 'CSI-FIC-2018-789',
        },
        {
          doctorId: doctor2.id,
          name: 'Pediatric Advanced Life Support (PALS)',
          issuingBody: 'American Heart Association',
          issueDate: new Date('2021-05-10'),
          expiryDate: new Date('2026-05-10'),
          credentialId: 'AHA-PALS-2021-654321',
        },
        {
          doctorId: doctor2.id,
          name: 'Neonatal Resuscitation Program (NRP)',
          issuingBody: 'American Academy of Pediatrics',
          issueDate: new Date('2022-01-25'),
          expiryDate: new Date('2025-01-25'),
          credentialId: 'AAP-NRP-2022-456',
        },
        {
          doctorId: doctor3.id,
          name: 'Invisalign Certified Provider',
          issuingBody: 'Align Technology',
          issueDate: new Date('2019-08-12'),
          credentialId: 'INV-CERT-2019-789012',
        },
        {
          doctorId: doctor3.id,
          name: 'Dental Implantology Certificate',
          issuingBody: 'Indian Dental Association',
          issueDate: new Date('2020-11-05'),
          credentialId: 'IDA-IMP-2020-345',
        },
      ],
    });

    // Add additional specializations - delete existing first
    await prisma.doctorSpecialization.deleteMany({
      where: { doctorId: { in: [doctor1.id, doctor2.id, doctor3.id] } },
    });

    await prisma.doctorSpecialization.createMany({
      data: [
        {
          doctorId: doctor1.id,
          specialization: 'CARDIOLOGY',
          isPrimary: true,
          yearsOfPractice: 10,
        },
        {
          doctorId: doctor1.id,
          specialization: 'INTERNAL_MEDICINE',
          isPrimary: false,
          yearsOfPractice: 12,
        },
        {
          doctorId: doctor2.id,
          specialization: 'PEDIATRICS',
          isPrimary: true,
          yearsOfPractice: 6,
        },
        {
          doctorId: doctor3.id,
          specialization: 'DENTAL',
          isPrimary: true,
          yearsOfPractice: 8,
        },
      ],
    });

    // Create DoctorClinic entries to properly associate doctors with the default clinic
    await prisma.doctorClinic.deleteMany({
      where: { doctorId: { in: [doctor1.id, doctor2.id, doctor3.id] } },
    });

    await prisma.doctorClinic.createMany({
      data: [
        {
          doctorId: doctor1.id,
          clinicId: defaultClinic.id,
          role: 'doctor',
          active: true,
        },
        {
          doctorId: doctor2.id,
          clinicId: defaultClinic.id,
          role: 'doctor',
          active: true,
        },
        {
          doctorId: doctor3.id,
          clinicId: defaultClinic.id,
          role: 'doctor',
          active: true,
        },
      ],
    });

    console.log('✅ Doctor profiles with education and certifications created');
    console.log('✅ DoctorClinic associations created');

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

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

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

    // Seed ICD-10 codes
    const icdCodes = [
      // Infectious diseases
      {
        code: 'A00',
        description: 'Cholera',
        category: 'Certain infectious and parasitic diseases',
      },
      {
        code: 'A09',
        description: 'Infectious gastroenteritis and colitis, unspecified',
        category: 'Certain infectious and parasitic diseases',
      },
      {
        code: 'A15',
        description: 'Respiratory tuberculosis',
        category: 'Certain infectious and parasitic diseases',
      },
      {
        code: 'A16',
        description: 'Respiratory tuberculosis, not confirmed',
        category: 'Certain infectious and parasitic diseases',
      },
      {
        code: 'A37',
        description: 'Whooping cough',
        category: 'Certain infectious and parasitic diseases',
      },
      {
        code: 'A38',
        description: 'Scarlet fever',
        category: 'Certain infectious and parasitic diseases',
      },
      {
        code: 'A49',
        description: 'Bacterial infection of unspecified site',
        category: 'Certain infectious and parasitic diseases',
      },
      {
        code: 'B00',
        description: 'Herpesviral [herpes simplex] infections',
        category: 'Certain infectious and parasitic diseases',
      },
      {
        code: 'B01',
        description: 'Varicella [chickenpox]',
        category: 'Certain infectious and parasitic diseases',
      },
      {
        code: 'B02',
        description: 'Zoster [herpes zoster]',
        category: 'Certain infectious and parasitic diseases',
      },
      {
        code: 'B05',
        description: 'Measles',
        category: 'Certain infectious and parasitic diseases',
      },
      {
        code: 'B06',
        description: 'Rubella [German measles]',
        category: 'Certain infectious and parasitic diseases',
      },
      {
        code: 'B07',
        description: 'Viral warts',
        category: 'Certain infectious and parasitic diseases',
      },
      {
        code: 'B15',
        description: 'Acute hepatitis A',
        category: 'Certain infectious and parasitic diseases',
      },
      {
        code: 'B16',
        description: 'Acute hepatitis B',
        category: 'Certain infectious and parasitic diseases',
      },
      {
        code: 'B17',
        description: 'Other acute viral hepatitis',
        category: 'Certain infectious and parasitic diseases',
      },
      {
        code: 'B18',
        description: 'Chronic viral hepatitis',
        category: 'Certain infectious and parasitic diseases',
      },
      {
        code: 'B34',
        description: 'Viral infection of unspecified site',
        category: 'Certain infectious and parasitic diseases',
      },
      {
        code: 'B35',
        description: 'Dermatophytosis',
        category: 'Certain infectious and parasitic diseases',
      },
      {
        code: 'B37',
        description: 'Candidiasis',
        category: 'Certain infectious and parasitic diseases',
      },

      // Neoplasms
      {
        code: 'C18',
        description: 'Malignant neoplasm of colon',
        category: 'Neoplasms',
      },
      {
        code: 'C34',
        description: 'Malignant neoplasm of bronchus and lung',
        category: 'Neoplasms',
      },
      {
        code: 'C50',
        description: 'Malignant neoplasm of breast',
        category: 'Neoplasms',
      },
      {
        code: 'C61',
        description: 'Malignant neoplasm of prostate',
        category: 'Neoplasms',
      },
      {
        code: 'D50',
        description: 'Iron deficiency anemia',
        category: 'Diseases of the blood',
      },
      {
        code: 'D64',
        description: 'Other anemias',
        category: 'Diseases of the blood',
      },

      // Endocrine/Metabolic
      {
        code: 'E03',
        description: 'Other hypothyroidism',
        category: 'Endocrine, nutritional and metabolic diseases',
      },
      {
        code: 'E04',
        description: 'Other nontoxic goiter',
        category: 'Endocrine, nutritional and metabolic diseases',
      },
      {
        code: 'E05',
        description: 'Thyrotoxicosis [hyperthyroidism]',
        category: 'Endocrine, nutritional and metabolic diseases',
      },
      {
        code: 'E06',
        description: 'Thyroiditis',
        category: 'Endocrine, nutritional and metabolic diseases',
      },
      {
        code: 'E10',
        description: 'Type 1 diabetes mellitus',
        category: 'Endocrine, nutritional and metabolic diseases',
      },
      {
        code: 'E11',
        description: 'Type 2 diabetes mellitus',
        category: 'Endocrine, nutritional and metabolic diseases',
      },
      {
        code: 'E13',
        description: 'Other specified diabetes mellitus',
        category: 'Endocrine, nutritional and metabolic diseases',
      },
      {
        code: 'E66',
        description: 'Overweight and obesity',
        category: 'Endocrine, nutritional and metabolic diseases',
      },
      {
        code: 'E78',
        description: 'Disorders of lipoprotein metabolism and other lipidemias',
        category: 'Endocrine, nutritional and metabolic diseases',
      },
      {
        code: 'E86',
        description: 'Volume depletion',
        category: 'Endocrine, nutritional and metabolic diseases',
      },
      {
        code: 'E87',
        description:
          'Other disorders of fluid, electrolyte and acid-base balance',
        category: 'Endocrine, nutritional and metabolic diseases',
      },

      // Mental disorders
      {
        code: 'F10',
        description: 'Alcohol related disorders',
        category: 'Mental and behavioural disorders',
      },
      {
        code: 'F17',
        description: 'Nicotine dependence',
        category: 'Mental and behavioural disorders',
      },
      {
        code: 'F20',
        description: 'Schizophrenia',
        category: 'Mental and behavioural disorders',
      },
      {
        code: 'F31',
        description: 'Bipolar affective disorder',
        category: 'Mental and behavioural disorders',
      },
      {
        code: 'F32',
        description: 'Depressive episode',
        category: 'Mental and behavioural disorders',
      },
      {
        code: 'F33',
        description: 'Recurrent depressive disorder',
        category: 'Mental and behavioural disorders',
      },
      {
        code: 'F40',
        description: 'Phobic anxiety disorders',
        category: 'Mental and behavioural disorders',
      },
      {
        code: 'F41',
        description: 'Other anxiety disorders',
        category: 'Mental and behavioural disorders',
      },
      {
        code: 'F43',
        description: 'Reaction to severe stress, and adjustment disorders',
        category: 'Mental and behavioural disorders',
      },
      {
        code: 'F45',
        description: 'Somatoform disorders',
        category: 'Mental and behavioural disorders',
      },
      {
        code: 'F51',
        description: 'Sleep disorders not due to a substance',
        category: 'Mental and behavioural disorders',
      },

      // Nervous system
      {
        code: 'G20',
        description: 'Parkinson disease',
        category: 'Diseases of the nervous system',
      },
      {
        code: 'G25',
        description: 'Other extrapyramidal and movement disorders',
        category: 'Diseases of the nervous system',
      },
      {
        code: 'G30',
        description: "Alzheimer's disease",
        category: 'Diseases of the nervous system',
      },
      {
        code: 'G35',
        description: 'Multiple sclerosis',
        category: 'Diseases of the nervous system',
      },
      {
        code: 'G40',
        description: 'Epilepsy',
        category: 'Diseases of the nervous system',
      },
      {
        code: 'G43',
        description: 'Migraine',
        category: 'Diseases of the nervous system',
      },
      {
        code: 'G44',
        description: 'Other headache syndromes',
        category: 'Diseases of the nervous system',
      },
      {
        code: 'G47',
        description: 'Sleep disorders',
        category: 'Diseases of the nervous system',
      },
      {
        code: 'G54',
        description: 'Nerve root and plexus disorders',
        category: 'Diseases of the nervous system',
      },
      {
        code: 'G56',
        description: 'Mononeuropathies of upper limb',
        category: 'Diseases of the nervous system',
      },
      {
        code: 'G57',
        description: 'Mononeuropathies of lower limb',
        category: 'Diseases of the nervous system',
      },
      {
        code: 'G62',
        description: 'Other polyneuropathies',
        category: 'Diseases of the nervous system',
      },

      // Eye disorders
      {
        code: 'H00',
        description: 'Hordeolum and chalazion',
        category: 'Diseases of the eye',
      },
      {
        code: 'H01',
        description: 'Other inflammation of eyelid',
        category: 'Diseases of the eye',
      },
      {
        code: 'H04',
        description: 'Disorders of lacrimal system',
        category: 'Diseases of the eye',
      },
      {
        code: 'H10',
        description: 'Conjunctivitis',
        category: 'Diseases of the eye',
      },
      {
        code: 'H25',
        description: 'Age-related cataract',
        category: 'Diseases of the eye',
      },
      {
        code: 'H26',
        description: 'Other cataract',
        category: 'Diseases of the eye',
      },
      { code: 'H40', description: 'Glaucoma', category: 'Diseases of the eye' },
      {
        code: 'H52',
        description: 'Disorders of refraction and accommodation',
        category: 'Diseases of the eye',
      },
      {
        code: 'H53',
        description: 'Visual disturbances',
        category: 'Diseases of the eye',
      },
      {
        code: 'H54',
        description: 'Blindness and low vision',
        category: 'Diseases of the eye',
      },

      // Ear disorders
      {
        code: 'H60',
        description: 'Otitis externa',
        category: 'Diseases of the ear',
      },
      {
        code: 'H65',
        description: 'Nonsuppurative otitis media',
        category: 'Diseases of the ear',
      },
      {
        code: 'H66',
        description: 'Suppurative and unspecified otitis media',
        category: 'Diseases of the ear',
      },
      {
        code: 'H70',
        description: 'Mastoiditis and related conditions',
        category: 'Diseases of the ear',
      },
      {
        code: 'H81',
        description: 'Disorders of vestibular function',
        category: 'Diseases of the ear',
      },
      {
        code: 'H90',
        description: 'Conductive and sensorineural hearing loss',
        category: 'Diseases of the ear',
      },
      {
        code: 'H91',
        description: 'Other hearing loss',
        category: 'Diseases of the ear',
      },

      // Circulatory system
      {
        code: 'I10',
        description: 'Essential (primary) hypertension',
        category: 'Diseases of the circulatory system',
      },
      {
        code: 'I11',
        description: 'Hypertensive heart disease',
        category: 'Diseases of the circulatory system',
      },
      {
        code: 'I12',
        description: 'Hypertensive chronic kidney disease',
        category: 'Diseases of the circulatory system',
      },
      {
        code: 'I20',
        description: 'Angina pectoris',
        category: 'Diseases of the circulatory system',
      },
      {
        code: 'I21',
        description: 'Acute myocardial infarction',
        category: 'Diseases of the circulatory system',
      },
      {
        code: 'I25',
        description: 'Chronic ischemic heart disease',
        category: 'Diseases of the circulatory system',
      },
      {
        code: 'I26',
        description: 'Pulmonary embolism',
        category: 'Diseases of the circulatory system',
      },
      {
        code: 'I42',
        description: 'Cardiomyopathy',
        category: 'Diseases of the circulatory system',
      },
      {
        code: 'I48',
        description: 'Atrial fibrillation and flutter',
        category: 'Diseases of the circulatory system',
      },
      {
        code: 'I49',
        description: 'Other cardiac arrhythmias',
        category: 'Diseases of the circulatory system',
      },
      {
        code: 'I50',
        description: 'Heart failure',
        category: 'Diseases of the circulatory system',
      },
      {
        code: 'I63',
        description: 'Cerebral infarction',
        category: 'Diseases of the circulatory system',
      },
      {
        code: 'I64',
        description: 'Stroke, not specified as hemorrhage or infarction',
        category: 'Diseases of the circulatory system',
      },
      {
        code: 'I70',
        description: 'Atherosclerosis',
        category: 'Diseases of the circulatory system',
      },
      {
        code: 'I73',
        description: 'Other peripheral vascular diseases',
        category: 'Diseases of the circulatory system',
      },
      {
        code: 'I80',
        description: 'Phlebitis and thrombophlebitis',
        category: 'Diseases of the circulatory system',
      },
      {
        code: 'I83',
        description: 'Varicose veins of lower extremities',
        category: 'Diseases of the circulatory system',
      },
      {
        code: 'I84',
        description: 'Hemorrhoids',
        category: 'Diseases of the circulatory system',
      },

      // Respiratory system
      {
        code: 'J00',
        description: 'Acute nasopharyngitis [common cold]',
        category: 'Diseases of the respiratory system',
      },
      {
        code: 'J01',
        description: 'Acute sinusitis',
        category: 'Diseases of the respiratory system',
      },
      {
        code: 'J02',
        description: 'Acute pharyngitis',
        category: 'Diseases of the respiratory system',
      },
      {
        code: 'J03',
        description: 'Acute tonsillitis',
        category: 'Diseases of the respiratory system',
      },
      {
        code: 'J04',
        description: 'Acute laryngitis and tracheitis',
        category: 'Diseases of the respiratory system',
      },
      {
        code: 'J06',
        description: 'Acute upper respiratory infections',
        category: 'Diseases of the respiratory system',
      },
      {
        code: 'J09',
        description: 'Influenza due to identified influenza virus',
        category: 'Diseases of the respiratory system',
      },
      {
        code: 'J10',
        description: 'Influenza due to other identified influenza virus',
        category: 'Diseases of the respiratory system',
      },
      {
        code: 'J11',
        description: 'Influenza, virus not identified',
        category: 'Diseases of the respiratory system',
      },
      {
        code: 'J12',
        description: 'Viral pneumonia, not elsewhere classified',
        category: 'Diseases of the respiratory system',
      },
      {
        code: 'J13',
        description: 'Pneumonia due to Streptococcus pneumoniae',
        category: 'Diseases of the respiratory system',
      },
      {
        code: 'J15',
        description: 'Bacterial pneumonia, not elsewhere classified',
        category: 'Diseases of the respiratory system',
      },
      {
        code: 'J18',
        description: 'Pneumonia, organism unspecified',
        category: 'Diseases of the respiratory system',
      },
      {
        code: 'J20',
        description: 'Acute bronchitis',
        category: 'Diseases of the respiratory system',
      },
      {
        code: 'J21',
        description: 'Acute bronchiolitis',
        category: 'Diseases of the respiratory system',
      },
      {
        code: 'J22',
        description: 'Unspecified acute lower respiratory infection',
        category: 'Diseases of the respiratory system',
      },
      {
        code: 'J30',
        description: 'Vasomotor and allergic rhinitis',
        category: 'Diseases of the respiratory system',
      },
      {
        code: 'J31',
        description: 'Chronic rhinitis, nasopharyngitis and pharyngitis',
        category: 'Diseases of the respiratory system',
      },
      {
        code: 'J32',
        description: 'Chronic sinusitis',
        category: 'Diseases of the respiratory system',
      },
      {
        code: 'J35',
        description: 'Chronic diseases of tonsils and adenoids',
        category: 'Diseases of the respiratory system',
      },
      {
        code: 'J40',
        description: 'Bronchitis, not specified as acute or chronic',
        category: 'Diseases of the respiratory system',
      },
      {
        code: 'J42',
        description: 'Unspecified chronic bronchitis',
        category: 'Diseases of the respiratory system',
      },
      {
        code: 'J44',
        description: 'Other chronic obstructive pulmonary disease',
        category: 'Diseases of the respiratory system',
      },
      {
        code: 'J45',
        description: 'Asthma',
        category: 'Diseases of the respiratory system',
      },
      {
        code: 'J46',
        description: 'Status asthmaticus',
        category: 'Diseases of the respiratory system',
      },
      {
        code: 'J47',
        description: 'Bronchiectasis',
        category: 'Diseases of the respiratory system',
      },
      {
        code: 'J96',
        description: 'Respiratory failure, not elsewhere classified',
        category: 'Diseases of the respiratory system',
      },
      {
        code: 'J98',
        description: 'Other respiratory disorders',
        category: 'Diseases of the respiratory system',
      },

      // Digestive system
      {
        code: 'K00',
        description: 'Disorders of tooth development and eruption',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K02',
        description: 'Dental caries',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K04',
        description: 'Diseases of pulp and periapical tissues',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K05',
        description: 'Gingivitis and periodontal diseases',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K08',
        description: 'Other disorders of teeth and supporting structures',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K12',
        description: 'Stomatitis and related lesions',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K13',
        description: 'Other diseases of lip and oral mucosa',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K20',
        description: 'Esophagitis',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K21',
        description: 'Gastro-esophageal reflux disease',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K25',
        description: 'Gastric ulcer',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K26',
        description: 'Duodenal ulcer',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K27',
        description: 'Peptic ulcer, site unspecified',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K29',
        description: 'Gastritis and duodenitis',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K30',
        description: 'Functional dyspepsia',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K35',
        description: 'Acute appendicitis',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K40',
        description: 'Inguinal hernia',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K42',
        description: 'Umbilical hernia',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K44',
        description: 'Diaphragmatic hernia',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K50',
        description: "Crohn's disease",
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K51',
        description: 'Ulcerative colitis',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K52',
        description: 'Other noninfective gastroenteritis and colitis',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K57',
        description: 'Diverticular disease of intestine',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K58',
        description: 'Irritable bowel syndrome',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K59',
        description: 'Other functional intestinal disorders',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K60',
        description: 'Fissure and fistula of anal and rectal regions',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K70',
        description: 'Alcoholic liver disease',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K74',
        description: 'Fibrosis and cirrhosis of liver',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K76',
        description: 'Other diseases of liver',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K80',
        description: 'Cholelithiasis',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K81',
        description: 'Cholecystitis',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K85',
        description: 'Acute pancreatitis',
        category: 'Diseases of the digestive system',
      },
      {
        code: 'K86',
        description: 'Other diseases of pancreas',
        category: 'Diseases of the digestive system',
      },

      // Skin disorders
      {
        code: 'L01',
        description: 'Impetigo',
        category: 'Diseases of the skin',
      },
      {
        code: 'L02',
        description: 'Cutaneous abscess, furuncle and carbuncle',
        category: 'Diseases of the skin',
      },
      {
        code: 'L03',
        description: 'Cellulitis',
        category: 'Diseases of the skin',
      },
      {
        code: 'L08',
        description: 'Other local infections of skin and subcutaneous tissue',
        category: 'Diseases of the skin',
      },
      {
        code: 'L10',
        description: 'Pemphigus',
        category: 'Diseases of the skin',
      },
      {
        code: 'L20',
        description: 'Atopic dermatitis',
        category: 'Diseases of the skin',
      },
      {
        code: 'L21',
        description: 'Seborrheic dermatitis',
        category: 'Diseases of the skin',
      },
      {
        code: 'L22',
        description: 'Diaper [napkin] dermatitis',
        category: 'Diseases of the skin',
      },
      {
        code: 'L23',
        description: 'Allergic contact dermatitis',
        category: 'Diseases of the skin',
      },
      {
        code: 'L24',
        description: 'Irritant contact dermatitis',
        category: 'Diseases of the skin',
      },
      {
        code: 'L25',
        description: 'Unspecified contact dermatitis',
        category: 'Diseases of the skin',
      },
      {
        code: 'L27',
        description: 'Dermatitis due to substances taken internally',
        category: 'Diseases of the skin',
      },
      {
        code: 'L30',
        description: 'Other dermatitis',
        category: 'Diseases of the skin',
      },
      {
        code: 'L40',
        description: 'Psoriasis',
        category: 'Diseases of the skin',
      },
      {
        code: 'L41',
        description: 'Parapsoriasis',
        category: 'Diseases of the skin',
      },
      {
        code: 'L42',
        description: 'Pityriasis rosea',
        category: 'Diseases of the skin',
      },
      {
        code: 'L43',
        description: 'Lichen planus',
        category: 'Diseases of the skin',
      },
      {
        code: 'L50',
        description: 'Urticaria',
        category: 'Diseases of the skin',
      },
      {
        code: 'L53',
        description: 'Other erythematous conditions',
        category: 'Diseases of the skin',
      },
      {
        code: 'L60',
        description: 'Nail disorders',
        category: 'Diseases of the skin',
      },
      {
        code: 'L63',
        description: 'Alopecia areata',
        category: 'Diseases of the skin',
      },
      {
        code: 'L64',
        description: 'Androgenic alopecia',
        category: 'Diseases of the skin',
      },
      {
        code: 'L65',
        description: 'Other nonscarring hair loss',
        category: 'Diseases of the skin',
      },
      { code: 'L70', description: 'Acne', category: 'Diseases of the skin' },
      { code: 'L71', description: 'Rosacea', category: 'Diseases of the skin' },
      {
        code: 'L72',
        description: 'Follicular cysts of skin and subcutaneous tissue',
        category: 'Diseases of the skin',
      },
      {
        code: 'L80',
        description: 'Vitiligo',
        category: 'Diseases of the skin',
      },
      {
        code: 'L81',
        description: 'Other disorders of pigmentation',
        category: 'Diseases of the skin',
      },
      {
        code: 'L82',
        description: 'Seborrheic keratosis',
        category: 'Diseases of the skin',
      },
      {
        code: 'L84',
        description: 'Corns and callosities',
        category: 'Diseases of the skin',
      },
      {
        code: 'L90',
        description: 'Atrophic disorders of skin',
        category: 'Diseases of the skin',
      },
      {
        code: 'L91',
        description: 'Hypertrophic disorders of skin',
        category: 'Diseases of the skin',
      },
      {
        code: 'L98',
        description: 'Other disorders of skin and subcutaneous tissue',
        category: 'Diseases of the skin',
      },

      // Musculoskeletal system
      {
        code: 'M05',
        description: 'Rheumatoid arthritis with rheumatoid factor',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M06',
        description: 'Other rheumatoid arthritis',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M10',
        description: 'Gout',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M13',
        description: 'Other arthritis',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M15',
        description: 'Polyosteoarthritis',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M16',
        description: 'Osteoarthritis of hip',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M17',
        description: 'Osteoarthritis of knee',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M19',
        description: 'Other and unspecified osteoarthritis',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M25',
        description: 'Other joint disorder, not elsewhere classified',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M32',
        description: 'Systemic lupus erythematosus',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M35',
        description: 'Other systemic involvement of connective tissue',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M40',
        description: 'Kyphosis and lordosis',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M41',
        description: 'Scoliosis',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M42',
        description: 'Spinal osteochondrosis',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M43',
        description: 'Other deforming dorsopathies',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M45',
        description: 'Ankylosing spondylitis',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M46',
        description: 'Other inflammatory spondylopathies',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M47',
        description: 'Spondylosis',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M50',
        description: 'Cervical disc disorders',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M51',
        description: 'Thoracic, thoracolumbar and lumbosacral disc disorders',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M53',
        description: 'Other dorsopathies, not elsewhere classified',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M54',
        description: 'Dorsalgia',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M60',
        description: 'Myositis',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M62',
        description: 'Other disorders of muscle',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M65',
        description: 'Synovitis and tenosynovitis',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M70',
        description:
          'Soft tissue disorders related to use, overuse and pressure',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M71',
        description: 'Other bursopathies',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M72',
        description: 'Fibroblastic disorders',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M75',
        description: 'Shoulder lesions',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M76',
        description: 'Enthesopathies, lower limb, excluding foot',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M77',
        description: 'Other enthesopathies',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M79',
        description: 'Other soft tissue disorders, not elsewhere classified',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M80',
        description: 'Osteoporosis with pathological fracture',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M81',
        description: 'Osteoporosis without pathological fracture',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M84',
        description: 'Disorders of continuity of bone',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M85',
        description: 'Other disorders of bone density and structure',
        category: 'Diseases of the musculoskeletal system',
      },
      {
        code: 'M89',
        description: 'Other disorders of bone',
        category: 'Diseases of the musculoskeletal system',
      },

      // Genitourinary system
      {
        code: 'N00',
        description: 'Acute nephritic syndrome',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N03',
        description: 'Chronic nephritic syndrome',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N04',
        description: 'Nephrotic syndrome',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N10',
        description: 'Acute tubulo-interstitial nephritis',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N11',
        description: 'Chronic tubulo-interstitial nephritis',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N12',
        description:
          'Tubulo-interstitial nephritis, not specified as acute or chronic',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N17',
        description: 'Acute kidney failure',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N18',
        description: 'Chronic kidney disease',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N19',
        description: 'Unspecified kidney failure',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N20',
        description: 'Calculus of kidney and ureter',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N21',
        description: 'Calculus of lower urinary tract',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N23',
        description: 'Unspecified renal colic',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N28',
        description: 'Other disorders of kidney and ureter',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N30',
        description: 'Cystitis',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N32',
        description: 'Other disorders of bladder',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N34',
        description: 'Urethritis and urethral syndrome',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N39',
        description: 'Other disorders of urinary system',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N40',
        description: 'Hyperplasia of prostate',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N41',
        description: 'Inflammatory diseases of prostate',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N43',
        description: 'Hydrocele and spermatocele',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N45',
        description: 'Orchitis and epididymitis',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N60',
        description: 'Benign mammary dysplasia',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N63',
        description: 'Unspecified lump in breast',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N64',
        description: 'Other disorders of breast',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N70',
        description: 'Salpingitis and oophoritis',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N72',
        description: 'Inflammatory disease of cervix uteri',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N73',
        description: 'Other female pelvic inflammatory diseases',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N76',
        description: 'Other inflammation of vagina and vulva',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N80',
        description: 'Endometriosis',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N81',
        description: 'Female genital prolapse',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N83',
        description:
          'Noninflammatory disorders of ovary, fallopian tube and broad ligament',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N84',
        description: 'Polyp of female genital tract',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N85',
        description: 'Other noninflammatory disorders of uterus, except cervix',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N89',
        description: 'Other noninflammatory disorders of vagina',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N91',
        description: 'Absent, scanty and rare menstruation',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N92',
        description: 'Excessive, frequent and irregular menstruation',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N94',
        description:
          'Pain and other conditions associated with female genital organs and menstrual cycle',
        category: 'Diseases of the genitourinary system',
      },
      {
        code: 'N95',
        description: 'Menopausal and other perimenopausal disorders',
        category: 'Diseases of the genitourinary system',
      },

      // Pregnancy
      {
        code: 'O10',
        description: 'Pre-existing hypertension complicating pregnancy',
        category: 'Pregnancy, childbirth and the puerperium',
      },
      {
        code: 'O13',
        description: 'Gestational hypertension',
        category: 'Pregnancy, childbirth and the puerperium',
      },
      {
        code: 'O14',
        description: 'Pre-eclampsia',
        category: 'Pregnancy, childbirth and the puerperium',
      },
      {
        code: 'O21',
        description: 'Excessive vomiting in pregnancy',
        category: 'Pregnancy, childbirth and the puerperium',
      },
      {
        code: 'O24',
        description: 'Diabetes mellitus in pregnancy',
        category: 'Pregnancy, childbirth and the puerperium',
      },
      {
        code: 'O99',
        description:
          'Other maternal diseases classifiable elsewhere but complicating pregnancy',
        category: 'Pregnancy, childbirth and the puerperium',
      },
      {
        code: 'Z34',
        description: 'Supervision of normal pregnancy',
        category: 'Pregnancy, childbirth and the puerperium',
      },

      // Symptoms and signs
      {
        code: 'R00',
        description: 'Abnormalities of heart beat',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R03',
        description: 'Abnormal blood-pressure reading, without diagnosis',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R04',
        description: 'Hemorrhage from respiratory passages',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R05',
        description: 'Cough',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R06',
        description: 'Abnormalities of breathing',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R07',
        description: 'Pain in throat and chest',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R10',
        description: 'Abdominal and pelvic pain',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R11',
        description: 'Nausea and vomiting',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R12',
        description: 'Heartburn',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R13',
        description: 'Dysphagia',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R14',
        description: 'Flatulence and related conditions',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R19',
        description:
          'Other symptoms and signs involving the digestive system and abdomen',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R20',
        description: 'Disturbances of skin sensation',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R21',
        description: 'Rash and other nonspecific skin eruption',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R22',
        description:
          'Localized swelling, mass and lump of skin and subcutaneous tissue',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R25',
        description: 'Abnormal involuntary movements',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R26',
        description: 'Abnormalities of gait and mobility',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R27',
        description: 'Other lack of coordination',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R29',
        description:
          'Other symptoms and signs involving the nervous and musculoskeletal systems',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R30',
        description: 'Pain associated with micturition',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R31',
        description: 'Hematuria',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R32',
        description: 'Unspecified urinary incontinence',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R33',
        description: 'Retention of urine',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R35',
        description: 'Polyuria',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R40',
        description: 'Somnolence, stupor and coma',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R42',
        description: 'Dizziness and giddiness',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R50',
        description: 'Fever of other and unknown origin',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R51',
        description: 'Headache',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R52',
        description: 'Pain, unspecified',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R53',
        description: 'Malaise and fatigue',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R55',
        description: 'Syncope and collapse',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R56',
        description: 'Convulsions, not elsewhere classified',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R60',
        description: 'Edema, not elsewhere classified',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R63',
        description: 'Symptoms and signs concerning food and fluid intake',
        category: 'Symptoms, signs and abnormal clinical findings',
      },
      {
        code: 'R73',
        description: 'Elevated blood glucose level',
        category: 'Symptoms, signs and abnormal clinical findings',
      },

      // Injury/Poisoning
      {
        code: 'S00',
        description: 'Superficial injury of head',
        category: 'Injury, poisoning and certain other consequences',
      },
      {
        code: 'S01',
        description: 'Open wound of head',
        category: 'Injury, poisoning and certain other consequences',
      },
      {
        code: 'S02',
        description: 'Fracture of skull and facial bones',
        category: 'Injury, poisoning and certain other consequences',
      },
      {
        code: 'S06',
        description: 'Intracranial injury',
        category: 'Injury, poisoning and certain other consequences',
      },
      {
        code: 'S09',
        description: 'Other and unspecified injuries of head',
        category: 'Injury, poisoning and certain other consequences',
      },
      {
        code: 'S20',
        description: 'Superficial injury of thorax',
        category: 'Injury, poisoning and certain other consequences',
      },
      {
        code: 'S22',
        description: 'Fracture of rib(s), sternum and thoracic spine',
        category: 'Injury, poisoning and certain other consequences',
      },
      {
        code: 'S32',
        description: 'Fracture of lumbar spine and pelvis',
        category: 'Injury, poisoning and certain other consequences',
      },
      {
        code: 'S42',
        description: 'Fracture of shoulder and upper arm',
        category: 'Injury, poisoning and certain other consequences',
      },
      {
        code: 'S52',
        description: 'Fracture of forearm',
        category: 'Injury, poisoning and certain other consequences',
      },
      {
        code: 'S62',
        description: 'Fracture at wrist and hand level',
        category: 'Injury, poisoning and certain other consequences',
      },
      {
        code: 'S72',
        description: 'Fracture of femur',
        category: 'Injury, poisoning and certain other consequences',
      },
      {
        code: 'S82',
        description: 'Fracture of lower leg, including ankle',
        category: 'Injury, poisoning and certain other consequences',
      },
      {
        code: 'S92',
        description: 'Fracture of foot and toe, except ankle',
        category: 'Injury, poisoning and certain other consequences',
      },
      {
        code: 'S93',
        description:
          'Dislocation and sprain of joints and ligaments at ankle, foot and toe level',
        category: 'Injury, poisoning and certain other consequences',
      },
      {
        code: 'T14',
        description: 'Injury of unspecified body region',
        category: 'Injury, poisoning and certain other consequences',
      },
      {
        code: 'T15',
        description: 'Foreign body on external eye',
        category: 'Injury, poisoning and certain other consequences',
      },
      {
        code: 'T16',
        description: 'Foreign body in ear',
        category: 'Injury, poisoning and certain other consequences',
      },
      {
        code: 'T17',
        description: 'Foreign body in respiratory tract',
        category: 'Injury, poisoning and certain other consequences',
      },
      {
        code: 'T18',
        description: 'Foreign body in alimentary tract',
        category: 'Injury, poisoning and certain other consequences',
      },
      {
        code: 'T30',
        description: 'Burn and corrosion, body region unspecified',
        category: 'Injury, poisoning and certain other consequences',
      },
      {
        code: 'T36',
        description: 'Poisoning by systemic antibiotics',
        category: 'Injury, poisoning and certain other consequences',
      },
      {
        code: 'T39',
        description:
          'Poisoning by nonopioid analgesics, antipyretics and antirheumatics',
        category: 'Injury, poisoning and certain other consequences',
      },
      {
        code: 'T43',
        description:
          'Poisoning by psychotropic drugs, not elsewhere classified',
        category: 'Injury, poisoning and certain other consequences',
      },
      {
        code: 'T51',
        description: 'Toxic effect of alcohol',
        category: 'Injury, poisoning and certain other consequences',
      },
      {
        code: 'T78',
        description: 'Adverse effects, not elsewhere classified',
        category: 'Injury, poisoning and certain other consequences',
      },
      {
        code: 'T88',
        description:
          'Other complications of surgical and medical care, not elsewhere classified',
        category: 'Injury, poisoning and certain other consequences',
      },

      // Factors influencing health
      {
        code: 'Z00',
        description:
          'General examination and investigation of persons without complaint',
        category: 'Factors influencing health status',
      },
      {
        code: 'Z01',
        description:
          'Other special examinations and investigations of persons without complaint',
        category: 'Factors influencing health status',
      },
      {
        code: 'Z02',
        description: 'Examination and encounter for administrative purposes',
        category: 'Factors influencing health status',
      },
      {
        code: 'Z03',
        description:
          'Encounter for medical observation for suspected diseases and conditions',
        category: 'Factors influencing health status',
      },
      {
        code: 'Z04',
        description:
          'Encounter for examination and observation for other reasons',
        category: 'Factors influencing health status',
      },
      {
        code: 'Z09',
        description:
          'Encounter for follow-up examination after completed treatment',
        category: 'Factors influencing health status',
      },
      {
        code: 'Z11',
        description:
          'Encounter for screening for infectious and parasitic diseases',
        category: 'Factors influencing health status',
      },
      {
        code: 'Z12',
        description: 'Encounter for screening for malignant neoplasms',
        category: 'Factors influencing health status',
      },
      {
        code: 'Z13',
        description: 'Encounter for screening for other diseases and disorders',
        category: 'Factors influencing health status',
      },
      {
        code: 'Z20',
        description: 'Contact with and exposure to communicable diseases',
        category: 'Factors influencing health status',
      },
      {
        code: 'Z23',
        description: 'Encounter for immunization',
        category: 'Factors influencing health status',
      },
      {
        code: 'Z30',
        description: 'Encounter for contraceptive management',
        category: 'Factors influencing health status',
      },
      {
        code: 'Z31',
        description: 'Encounter for procreative management',
        category: 'Factors influencing health status',
      },
      {
        code: 'Z32',
        description:
          'Encounter for pregnancy test and childbirth and childcare instruction',
        category: 'Factors influencing health status',
      },
      {
        code: 'Z33',
        description: 'Pregnant state',
        category: 'Factors influencing health status',
      },
      {
        code: 'Z36',
        description: 'Encounter for antenatal screening of mother',
        category: 'Factors influencing health status',
      },
      {
        code: 'Z38',
        description:
          'Liveborn infants according to place of birth and type of delivery',
        category: 'Factors influencing health status',
      },
      {
        code: 'Z39',
        description: 'Encounter for maternal postpartum care and examination',
        category: 'Factors influencing health status',
      },
      {
        code: 'Z71',
        description:
          'Persons encountering health services for other counselling and medical advice',
        category: 'Factors influencing health status',
      },
      {
        code: 'Z76',
        description:
          'Persons encountering health services in other circumstances',
        category: 'Factors influencing health status',
      },
      {
        code: 'Z86',
        description: 'Personal history of certain other diseases',
        category: 'Factors influencing health status',
      },
      {
        code: 'Z87',
        description: 'Personal history of other diseases and conditions',
        category: 'Factors influencing health status',
      },
      {
        code: 'Z88',
        description:
          'Allergy status to drugs, medicaments and biological substances',
        category: 'Factors influencing health status',
      },
      {
        code: 'Z96',
        description: 'Presence of other functional implants',
        category: 'Factors influencing health status',
      },
      {
        code: 'Z97',
        description: 'Presence of other devices',
        category: 'Factors influencing health status',
      },
      {
        code: 'Z98',
        description: 'Other postprocedural states',
        category: 'Factors influencing health status',
      },
    ];

    // Upsert ICD codes - delete first to handle changes
    console.log('🏥 Seeding ICD-10 codes...');

    // Create ICD codes in batches
    for (const icd of icdCodes) {
      await prisma.icdCode.upsert({
        where: { code: icd.code },
        update: { description: icd.description, category: icd.category },
        create: { ...icd, version: 'ICD-10' },
      });
    }

    console.log(`✅ ${icdCodes.length} ICD-10 codes seeded`);

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Clinic: 1 (Docita Health Clinic - PRO tier)`);
    console.log(
      `   - Users: 6 (1 super admin, 1 clinic admin, 3 doctors, 1 receptionist)`,
    );
    console.log(`   - Patients: ${patients.length}`);
    console.log(`   - Appointments: 5`);
    console.log(`   - Prescriptions: 1`);
    console.log(`   - Invoices: 1`);
    console.log(`   - Documents: 2`);
    console.log(`   - Doctor Education Records: 8`);
    console.log(`   - Doctor Certifications: 6`);
    console.log(`   - ICD-10 Codes: ${icdCodes.length}`);
    console.log('\n🔑 Login credentials:');
    console.log('\n   📱 Main App (http://localhost:3000):');
    console.log('   - clinic.admin@docita.com / password123 (Clinic Admin)');
    console.log(
      '   - doctor@docita.com / password123 (Dr. Vamsi - Cardiologist)',
    );
    console.log(
      '   - dr.sharma@docita.com / password123 (Dr. Priya - Pediatrician)',
    );
    console.log('   - dr.dental@docita.com / password123 (Dr. Arun - Dentist)');
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
