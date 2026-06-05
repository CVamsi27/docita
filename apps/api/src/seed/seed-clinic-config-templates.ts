import {
  PrismaClient,
  WhatsappButtonType,
  WhatsappTemplateCategory,
  WhatsappTemplateStatus,
} from '@workspace/db';

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

  await seedReminderSettings(prisma, clinicId);
  await seedMrnSequence(prisma, clinicId);
  await assignPatientMrns(prisma, patients);
  await replaceWhatsappTemplates(prisma, clinicId);
  await replacePrescriptionTemplates(prisma, {
    doctor1Id,
    doctor2Id,
    doctor3Id,
  });
}

async function seedReminderSettings(
  prisma: PrismaClient,
  clinicId: string,
): Promise<void> {
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
}

async function seedMrnSequence(
  prisma: PrismaClient,
  clinicId: string,
): Promise<void> {
  await prisma.mrnSequence.upsert({
    where: { clinicId },
    update: {},
    create: {
      clinicId,
      prefix: 'DOC',
      lastNumber: 5,
    },
  });
}

async function assignPatientMrns(
  prisma: PrismaClient,
  patients: SeedEntityRef[],
): Promise<void> {
  await Promise.all(
    patients.map((patient) =>
      prisma.patient.update({
        where: { id: patient.id },
        data: {
          mrn: `DOC-${patient.id.slice(-8).toUpperCase()}`,
        },
      }),
    ),
  );
}

async function replaceWhatsappTemplates(
  prisma: PrismaClient,
  clinicId: string,
): Promise<void> {
  await prisma.whatsappTemplate.deleteMany({
    where: { clinicId },
  });

  await prisma.whatsappTemplate.createMany({
    data: getWhatsappTemplateRows(clinicId),
  });
}

function getWhatsappTemplateRows(clinicId: string) {
  return [
    getAppointmentReminderDayBeforeTemplate(clinicId),
    getAppointmentReminderThirtyMinuteTemplate(clinicId),
    getPrescriptionSentTemplate(clinicId),
    getInvoicePaymentTemplate(clinicId),
  ];
}

function getAppointmentReminderDayBeforeTemplate(clinicId: string) {
  return {
    clinicId,
    name: 'appointment_reminder_24hr',
    category: WhatsappTemplateCategory.APPOINTMENT,
    content:
      'Hi {{patientName}}!\n\nThis is a reminder for your appointment tomorrow:\n\nDate: {{date}}\nTime: {{time}}\nDoctor: {{doctorName}}\nDocita Health Clinic\n\nReply with:\nCONFIRM to confirm\nCANCEL to cancel\nDELAY if running late',
    variables: ['patientName', 'date', 'time', 'doctorName'],
    buttonType: WhatsappButtonType.QUICK_REPLY,
    buttons: [
      { id: 'confirm', title: 'Confirm' },
      { id: 'cancel', title: 'Cancel' },
      { id: 'delay', title: 'Delay' },
    ],
    status: WhatsappTemplateStatus.APPROVED,
    isActive: true,
    isDefault: true,
  };
}

function getAppointmentReminderThirtyMinuteTemplate(clinicId: string) {
  return {
    clinicId,
    name: 'appointment_reminder_30min',
    category: WhatsappTemplateCategory.APPOINTMENT,
    content:
      'Hi {{patientName}}!\n\nYour appointment is in 30 minutes:\n\nDoctor: {{doctorName}}\nDocita Health Clinic\n\nPlease arrive 10 minutes early. See you soon!',
    variables: ['patientName', 'doctorName'],
    buttonType: WhatsappButtonType.NONE,
    status: WhatsappTemplateStatus.APPROVED,
    isActive: true,
    isDefault: true,
  };
}

function getPrescriptionSentTemplate(clinicId: string) {
  return {
    clinicId,
    name: 'prescription_sent',
    category: WhatsappTemplateCategory.PRESCRIPTION,
    content:
      'Hi {{patientName}}!\n\nYour prescription from Dr. {{doctorName}} is ready.\n\nView your prescription here:\n{{prescriptionUrl}}\n\nGet well soon!',
    variables: ['patientName', 'doctorName', 'prescriptionUrl'],
    buttonType: WhatsappButtonType.CALL_TO_ACTION,
    buttons: [
      {
        type: 'URL',
        title: 'View Prescription',
        url: '{{prescriptionUrl}}',
      },
    ],
    status: WhatsappTemplateStatus.APPROVED,
    isActive: true,
    isDefault: true,
  };
}

function getInvoicePaymentTemplate(clinicId: string) {
  return {
    clinicId,
    name: 'invoice_payment',
    category: WhatsappTemplateCategory.INVOICE,
    content:
      'Hi {{patientName}}!\n\nYour invoice #{{invoiceNumber}} for {{amount}} is ready.\n\nPay online:\n{{paymentUrl}}\n\nThank you for choosing Docita Health Clinic!',
    variables: ['patientName', 'invoiceNumber', 'amount', 'paymentUrl'],
    buttonType: WhatsappButtonType.CALL_TO_ACTION,
    buttons: [{ type: 'URL', title: 'Pay Now', url: '{{paymentUrl}}' }],
    status: WhatsappTemplateStatus.APPROVED,
    isActive: true,
    isDefault: true,
  };
}

async function replacePrescriptionTemplates(
  prisma: PrismaClient,
  params: {
    doctor1Id: string;
    doctor2Id: string;
    doctor3Id: string;
  },
): Promise<void> {
  const { doctor1Id, doctor2Id, doctor3Id } = params;
  await prisma.prescriptionTemplate.deleteMany({
    where: { userId: { in: [doctor1Id, doctor2Id, doctor3Id] } },
  });

  await prisma.prescriptionTemplate.createMany({
    data: getPrescriptionTemplateRows({ doctor1Id, doctor2Id, doctor3Id }),
  });
}

function getPrescriptionTemplateRows(params: {
  doctor1Id: string;
  doctor2Id: string;
  doctor3Id: string;
}) {
  const { doctor1Id, doctor2Id, doctor3Id } = params;
  return [
    getCommonColdTreatmentTemplate(doctor1Id),
    getHypertensionManagementTemplate(doctor1Id),
    getPediatricFeverTemplate(doctor2Id),
    getDentalPainReliefTemplate(doctor3Id),
  ];
}

function getCommonColdTreatmentTemplate(userId: string) {
  return {
    name: 'Common Cold Treatment',
    userId,
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
  };
}

function getHypertensionManagementTemplate(userId: string) {
  return {
    name: 'Hypertension Management',
    userId,
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
  };
}

function getPediatricFeverTemplate(userId: string) {
  return {
    name: 'Pediatric Fever',
    userId,
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
  };
}

function getDentalPainReliefTemplate(userId: string) {
  return {
    name: 'Dental Pain Relief',
    userId,
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
  };
}
