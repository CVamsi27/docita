import { PrismaClient } from '@workspace/db';

type SeedEntityRef = { id: string };

interface SeedClinicConfigTemplatesParams {
  clinicId: string;
  doctor1Id: string;
  doctor2Id: string;
  doctor3Id: string;
  patients: SeedEntityRef[];
}

export async function seedClinicConfigTemplates(
  prisma: PrismaClient,
  params: SeedClinicConfigTemplatesParams,
): Promise<void> {
  const { clinicId, doctor1Id, doctor2Id, doctor3Id, patients } = params;

  await prisma.reminderSettings.upsert({
    where: { clinicId },
    update: {},
    create: {
      clinicId,
      enabled: true,
      smsEnabled: false,
      emailEnabled: true,
      whatsappEnabled: true,
      hoursBeforeAppt: 24,
      minutesBefore30: true,
      emailSubject: 'Appointment Reminder - Docita Health Clinic',
      emailTemplate:
        'Dear {{patientName}}, this is a reminder for your appointment with {{doctorName}} on {{date}} at {{time}}.',
      whatsappTemplate: 'appointment_reminder_24hr',
    },
  });

  await prisma.mrnSequence.upsert({
    where: { clinicId },
    update: {},
    create: {
      clinicId,
      prefix: 'DOC',
      lastNumber: 5,
    },
  });

  await Promise.all(
    patients.map((patient, index) =>
      prisma.patient.update({
        where: { id: patient.id },
        data: { mrn: `DOC-${String(index + 1).padStart(5, '0')}` },
      }),
    ),
  );

  await prisma.whatsappTemplate.deleteMany({
    where: { clinicId },
  });

  await prisma.whatsappTemplate.createMany({
    data: [
      {
        clinicId,
        name: 'appointment_reminder_24hr',
        category: 'APPOINTMENT',
        content:
          'Hi {{patientName}}!\n\nThis is a reminder for your appointment tomorrow:\n\nDate: {{date}}\nTime: {{time}}\nDoctor: {{doctorName}}\nDocita Health Clinic\n\nReply with:\nCONFIRM to confirm\nCANCEL to cancel\nDELAY if running late',
        variables: ['patientName', 'date', 'time', 'doctorName'],
        buttonType: 'QUICK_REPLY',
        buttons: [
          { id: 'confirm', title: 'Confirm' },
          { id: 'cancel', title: 'Cancel' },
          { id: 'delay', title: 'Delay' },
        ],
        status: 'APPROVED',
        isActive: true,
        isDefault: true,
      },
      {
        clinicId,
        name: 'appointment_reminder_30min',
        category: 'APPOINTMENT',
        content:
          'Hi {{patientName}}!\n\nYour appointment is in 30 minutes:\n\nDoctor: {{doctorName}}\nDocita Health Clinic\n\nPlease arrive 10 minutes early. See you soon!',
        variables: ['patientName', 'doctorName'],
        buttonType: 'NONE',
        status: 'APPROVED',
        isActive: true,
        isDefault: true,
      },
      {
        clinicId,
        name: 'prescription_sent',
        category: 'PRESCRIPTION',
        content:
          'Hi {{patientName}}!\n\nYour prescription from Dr. {{doctorName}} is ready.\n\nView your prescription here:\n{{prescriptionUrl}}\n\nGet well soon!',
        variables: ['patientName', 'doctorName', 'prescriptionUrl'],
        buttonType: 'CALL_TO_ACTION',
        buttons: [
          {
            type: 'URL',
            title: 'View Prescription',
            url: '{{prescriptionUrl}}',
          },
        ],
        status: 'APPROVED',
        isActive: true,
        isDefault: true,
      },
      {
        clinicId,
        name: 'invoice_payment',
        category: 'INVOICE',
        content:
          'Hi {{patientName}}!\n\nYour invoice #{{invoiceNumber}} for ₹{{amount}} is ready.\n\nPay online:\n{{paymentUrl}}\n\nThank you for choosing Docita Health Clinic!',
        variables: ['patientName', 'invoiceNumber', 'amount', 'paymentUrl'],
        buttonType: 'CALL_TO_ACTION',
        buttons: [{ type: 'URL', title: 'Pay Now', url: '{{paymentUrl}}' }],
        status: 'APPROVED',
        isActive: true,
        isDefault: true,
      },
    ],
  });

  await prisma.prescriptionTemplate.deleteMany({
    where: { userId: { in: [doctor1Id, doctor2Id, doctor3Id] } },
  });

  await prisma.prescriptionTemplate.createMany({
    data: [
      {
        name: 'Common Cold Treatment',
        userId: doctor1Id,
        medications: [
          {
            name: 'Paracetamol',
            dosage: '500mg',
            frequency: 'Three times daily',
            duration: '5 days',
          },
          {
            name: 'Cetirizine',
            dosage: '10mg',
            frequency: 'Once daily at night',
            duration: '5 days',
          },
          {
            name: 'Vitamin C',
            dosage: '500mg',
            frequency: 'Once daily',
            duration: '10 days',
          },
        ],
        instructions:
          'Rest well, stay hydrated. Avoid cold foods and drinks. Return if symptoms persist beyond 5 days.',
      },
      {
        name: 'Hypertension Management',
        userId: doctor1Id,
        medications: [
          {
            name: 'Amlodipine',
            dosage: '5mg',
            frequency: 'Once daily morning',
            duration: '30 days',
          },
          {
            name: 'Telmisartan',
            dosage: '40mg',
            frequency: 'Once daily morning',
            duration: '30 days',
          },
        ],
        instructions:
          'Monitor BP daily. Low sodium diet. Regular exercise. Review in 4 weeks.',
      },
      {
        name: 'Pediatric Fever',
        userId: doctor2Id,
        medications: [
          {
            name: 'Paracetamol Syrup',
            dosage: '5ml',
            frequency: 'Every 6 hours if fever',
            duration: '3 days',
          },
          {
            name: 'ORS',
            dosage: '100ml',
            frequency: 'After each loose motion',
            duration: 'As needed',
          },
        ],
        instructions:
          'Give plenty of fluids. Sponge with lukewarm water if fever > 101°F. Return immediately if fever persists beyond 3 days or child becomes lethargic.',
      },
      {
        name: 'Dental Pain Relief',
        userId: doctor3Id,
        medications: [
          {
            name: 'Ibuprofen',
            dosage: '400mg',
            frequency: 'Three times daily after food',
            duration: '5 days',
          },
          {
            name: 'Amoxicillin',
            dosage: '500mg',
            frequency: 'Three times daily',
            duration: '5 days',
          },
          {
            name: 'Chlorhexidine Mouthwash',
            dosage: '10ml',
            frequency: 'Twice daily',
            duration: '7 days',
          },
        ],
        instructions:
          'Avoid chewing on the affected side. Rinse mouth after meals. Follow up in 1 week.',
      },
    ],
  });
}
