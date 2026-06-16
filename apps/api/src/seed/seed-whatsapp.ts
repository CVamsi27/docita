import { PrismaClient } from '@workspace/db';

type SeedEntityRef = { id: string };

interface SeedWhatsappParams {
  clinicId: string;
  patients: SeedEntityRef[];
}

interface WhatsappLogSeed {
  id: string;
  patientIndex: number;
  type: string;
  message: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
  phoneNumber: string;
  daysOffset: number;
  hoursOffset: number;
}

function getWhatsappLogs(): WhatsappLogSeed[] {
  return [
    // Appointment reminders - recent at top
    {
      id: 'seed-wa-apt-reminder-01',
      patientIndex: 4,
      type: 'APPOINTMENT_REMINDER',
      message:
        'Hi Suresh!\n\nThis is a reminder for your appointment tomorrow:\n\nDate: {{date}}\nTime: 9:00 AM\nDoctor: Dr. Admin\nDocita Health Clinic\n\nReply with:\nCONFIRM to confirm\nCANCEL to cancel\nDELAY if running late',
      status: 'DELIVERED',
      phoneNumber: '9000000005',
      daysOffset: 0,
      hoursOffset: -2,
    },
    {
      id: 'seed-wa-apt-reminder-02',
      patientIndex: 2,
      type: 'APPOINTMENT_REMINDER',
      message:
        'Hi Amit!\n\nYour appointment is in 30 minutes:\n\nDoctor: Dr. Admin\nDocita Health Clinic\n\nPlease arrive 10 minutes early. See you soon!',
      status: 'SENT',
      phoneNumber: '9000000003',
      daysOffset: 0,
      hoursOffset: -1,
    },
    {
      id: 'seed-wa-apt-reminder-03',
      patientIndex: 15,
      type: 'APPOINTMENT_REMINDER',
      message:
        'Hi Pooja!\n\nThis is a reminder for your appointment tomorrow:\n\nDate: {{date}}\nTime: 11:00 AM\nDoctor: Dr. Admin\nDocita Health Clinic\n\nReply with:\nCONFIRM to confirm\nCANCEL to cancel\nDELAY if running late',
      status: 'SENT',
      phoneNumber: '9000000016',
      daysOffset: 0,
      hoursOffset: -3,
    },
    {
      id: 'seed-wa-apt-reminder-04',
      patientIndex: 8,
      type: 'APPOINTMENT_REMINDER',
      message:
        'Hi Arjun!\n\nYour appointment is in 30 minutes:\n\nDoctor: Dr. Admin\nDocita Health Clinic\n\nPlease arrive 10 minutes early. See you soon!',
      status: 'READ',
      phoneNumber: '9000000009',
      daysOffset: 0,
      hoursOffset: -4,
    },
    {
      id: 'seed-wa-apt-reminder-05',
      patientIndex: 12,
      type: 'APPOINTMENT_REMINDER',
      message:
        'Hi Rohit!\n\nThis is a reminder for your appointment today:\n\nTime: 10:00 AM\nDoctor: Dr. Admin\nDocita Health Clinic\n\nPlease arrive 10 minutes early.',
      status: 'DELIVERED',
      phoneNumber: '9000000013',
      daysOffset: 0,
      hoursOffset: -5,
    },
    // Invoice notifications
    {
      id: 'seed-wa-invoice-01',
      patientIndex: 0,
      type: 'INVOICE',
      message:
        'Hi Rajesh!\n\nYour invoice #DC2627-000001 for ₹1,300 is ready.\n\nPay online:\nhttps://pay.docita.work/inv/seed-invoice-rajesh\n\nThank you for choosing Docita Health Clinic!',
      status: 'DELIVERED',
      phoneNumber: '9000000001',
      daysOffset: -1,
      hoursOffset: 0,
    },
    {
      id: 'seed-wa-invoice-02',
      patientIndex: 1,
      type: 'INVOICE',
      message:
        'Hi Priya!\n\nYour invoice #DC2627-000002 for ₹1,400 is ready.\n\nPay online:\nhttps://pay.docita.work/inv/seed-inv-seed-apt-past-01\n\nThank you for choosing Docita Health Clinic!',
      status: 'SENT',
      phoneNumber: '9000000002',
      daysOffset: -2,
      hoursOffset: 0,
    },
    {
      id: 'seed-wa-invoice-03',
      patientIndex: 3,
      type: 'INVOICE',
      message:
        'Hi Lakshmi!\n\nYour invoice #DC2627-000003 for ₹1,500 is ready.\n\nPay online:\nhttps://pay.docita.work/inv/seed-inv-seed-apt-past-02\n\nThank you for choosing Docita Health Clinic!',
      status: 'DELIVERED',
      phoneNumber: '9000000004',
      daysOffset: -3,
      hoursOffset: 0,
    },
    // Prescription sent
    {
      id: 'seed-wa-rx-01',
      patientIndex: 0,
      type: 'PRESCRIPTION',
      message:
        'Hi Rajesh!\n\nYour prescription from Dr. Admin is ready.\n\nView your prescription here:\nhttps://rx.docita.work/seed-prescription-rajesh\n\nGet well soon!',
      status: 'DELIVERED',
      phoneNumber: '9000000001',
      daysOffset: -1,
      hoursOffset: -1,
    },
    {
      id: 'seed-wa-rx-02',
      patientIndex: 4,
      type: 'PRESCRIPTION',
      message:
        'Hi Suresh!\n\nYour prescription from Dr. Admin is ready.\n\nView your prescription here:\nhttps://rx.docita.work/seed-rx-seed-apt-today-00\n\nGet well soon!',
      status: 'SENT',
      phoneNumber: '9000000005',
      daysOffset: 0,
      hoursOffset: -6,
    },
    // Follow-up reminders
    {
      id: 'seed-wa-followup-01',
      patientIndex: 0,
      type: 'FOLLOW_UP',
      message:
        'Hi Rajesh!\n\nYou have a follow-up appointment scheduled for tomorrow with Dr. Admin.\n\nPlease confirm your visit by replying CONFIRM.\n\nDocita Health Clinic',
      status: 'SENT',
      phoneNumber: '9000000001',
      daysOffset: 0,
      hoursOffset: -7,
    },
  ];
}

export async function seedWhatsappLogs(
  prisma: PrismaClient,
  params: SeedWhatsappParams,
): Promise<void> {
  const { clinicId, patients } = params;
  const logs = getWhatsappLogs();

  for (const log of logs) {
    const patient = patients[log.patientIndex % patients.length];
    const sentAt = new Date();
    sentAt.setDate(sentAt.getDate() + log.daysOffset);
    sentAt.setHours(sentAt.getHours() + log.hoursOffset);

    const deliveredAt =
      log.status === 'DELIVERED' || log.status === 'READ'
        ? new Date(sentAt.getTime() + 5 * 60_000)
        : null;

    const commonFields = {
      clinicId,
      patientId: patient.id,
      type: log.type,
      provider: 'WHATSAPP_CLOUD' as const,
      phoneNumber: log.phoneNumber,
      message: log.message,
      status: log.status as 'SENT' | 'DELIVERED' | 'READ',
      deliveredAt,
      senderMode: 'MANAGED' as const,
    };

    await prisma.whatsappLog.upsert({
      where: { id: log.id },
      update: commonFields,
      create: { id: log.id, ...commonFields, createdAt: sentAt },
    });
  }
}
