import {
  PrismaClient,
  Prisma,
  MedicalDocumentType,
  MedicalDocumentStatus,
} from '@workspace/db';

type SeedEntityRef = { id: string };

interface SeedMedicalDocsParams {
  clinicId: string;
  doctor1Id: string;
  patients: SeedEntityRef[];
}

interface MedicalDocumentSeed {
  id: string;
  type: MedicalDocumentType;
  patientIndex: number;
  doctorKey: 'd1';
  title: string;
  content: Record<string, unknown>;
  status: MedicalDocumentStatus;
  daysOffset: number;
}

function getMedicalDocumentSeeds(): MedicalDocumentSeed[] {
  return [
    {
      id: 'seed-meddoc-mc-rajesh',
      type: 'MEDICAL_CERTIFICATE',
      patientIndex: 0,
      doctorKey: 'd1',
      title: 'Medical Certificate - Rajesh Kumar',
      content: {
        patientName: 'Rajesh Kumar',
        diagnosis: 'Type 2 Diabetes Mellitus',
        fitnessStatus: 'FIT',
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        remarks:
          'Patient is fit for light duty. Avoid strenuous physical activity. Regular monitoring of blood sugar levels advised.',
      },
      status: 'SIGNED',
      daysOffset: -5,
    },
    {
      id: 'seed-meddoc-fc-priya',
      type: 'FITNESS_CERTIFICATE',
      patientIndex: 1,
      doctorKey: 'd1',
      title: 'Fitness Certificate - Priya Nair',
      content: {
        patientName: 'Priya Nair',
        fitnessStatus: 'FIT',
        purpose: 'Employment',
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        remarks:
          'Patient is medically fit for employment. No underlying conditions that would prevent normal duties.',
      },
      status: 'SIGNED',
      daysOffset: -10,
    },
    {
      id: 'seed-meddoc-rl-vikram',
      type: 'REFERRAL_LETTER',
      patientIndex: 6,
      doctorKey: 'd1',
      title: 'Referral Letter - Vikram Singh to Cardiologist',
      content: {
        patientName: 'Vikram Singh',
        referredTo: 'Dr. Cardiology Specialist, Apollo Hospital',
        reason: 'Coronary Artery Disease - requires specialist evaluation',
        clinicalSummary:
          'Known case of CAD. ECG shows ST changes. Echocardiography recommended. Patient stable for referral.',
        urgency: 'ROUTINE',
      },
      status: 'SIGNED',
      daysOffset: -15,
    },
    {
      id: 'seed-meddoc-ds-karan',
      type: 'DISCHARGE_SUMMARY',
      patientIndex: 10,
      doctorKey: 'd1',
      title: 'Discharge Summary - Karan Verma',
      content: {
        patientName: 'Karan Verma',
        admissionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        dischargeDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        diagnosis: 'Hypertension with COPD exacerbation',
        treatmentSummary:
          'Managed with IV antihypertensives, nebulization, and supportive care. Stable on discharge.',
        dischargeMedications: [
          'Amlodipine 5mg OD',
          'Salbutamol inhaler PRN',
          'Pantoprazole 40mg OD',
        ],
        followUpInstructions:
          'Follow up in 1 week. Monitor BP daily. Avoid cold exposure.',
      },
      status: 'SIGNED',
      daysOffset: -2,
    },
    {
      id: 'seed-meddoc-sn-rahul',
      type: 'SICK_NOTE',
      patientIndex: 16,
      doctorKey: 'd1',
      title: 'Sick Note - Rahul Mehta',
      content: {
        patientName: 'Rahul Mehta',
        reason: 'Childhood Asthma exacerbation',
        validFrom: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        validUntil: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        remarks:
          'Patient requires rest for 4 days. Avoid dusty environments. Continue prescribed inhaler.',
      },
      status: 'SIGNED',
      daysOffset: -2,
    },
    {
      id: 'seed-meddoc-mc-sanjay',
      type: 'MEDICAL_CERTIFICATE',
      patientIndex: 18,
      doctorKey: 'd1',
      title: 'Medical Certificate - Sanjay Kapoor',
      content: {
        patientName: 'Sanjay Kapoor',
        diagnosis: 'Post-Cataract Surgery Recovery',
        fitnessStatus: 'TEMPORARILY_UNFIT',
        validFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        validUntil: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        remarks:
          'Patient recovering from cataract surgery. Avoid heavy lifting and bright light exposure. Review in 3 weeks.',
      },
      status: 'SIGNED',
      daysOffset: -7,
    },
  ];
}

export async function seedMedicalDocuments(
  prisma: PrismaClient,
  params: SeedMedicalDocsParams,
): Promise<void> {
  const { clinicId, doctor1Id, patients } = params;
  const docs = getMedicalDocumentSeeds();

  for (const doc of docs) {
    const patient = patients[doc.patientIndex % patients.length];
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() + doc.daysOffset);
    const signedAt =
      doc.status === 'SIGNED' ? new Date(createdAt.getTime() + 60_000) : null;

    const commonFields = {
      type: doc.type,
      patientId: patient.id,
      doctorId: doctor1Id,
      clinicId,
      title: doc.title,
      content: doc.content as Prisma.InputJsonValue,
      status: doc.status,
      createdAt,
      signedAt,
    };

    await prisma.medicalDocument.upsert({
      where: { id: doc.id },
      update: commonFields,
      create: { id: doc.id, ...commonFields },
    });
  }
}
