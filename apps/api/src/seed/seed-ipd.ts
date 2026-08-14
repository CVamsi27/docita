import { AdmissionStatus, PrismaClient } from '@workspace/db';

interface SeedIpdParams {
  clinicId: string;
  doctor1Id: string;
  doctor2Id: string;
  patientIds: string[];
}

const WARD_ID = 'seed-ward-general';
const ROOMS = [
  { id: 'seed-room-101', number: '101', type: 'General', charges: 1500 },
  { id: 'seed-room-201', number: '201', type: 'Semi-Private', charges: 3000 },
  { id: 'seed-room-301', number: '301', type: 'Private', charges: 6000 },
];
const BEDS = [
  { id: 'seed-bed-101a', roomId: 'seed-room-101', bedNumber: '101-A' },
  { id: 'seed-bed-101b', roomId: 'seed-room-101', bedNumber: '101-B' },
  { id: 'seed-bed-201a', roomId: 'seed-room-201', bedNumber: '201-A' },
  { id: 'seed-bed-201b', roomId: 'seed-room-201', bedNumber: '201-B' },
  { id: 'seed-bed-301a', roomId: 'seed-room-301', bedNumber: '301-A' },
];

function dateOffset(days: number): Date {
  const d = new Date();
  d.setHours(8, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

export async function seedIpd(
  prisma: PrismaClient,
  params: SeedIpdParams,
): Promise<void> {
  const { clinicId, doctor1Id, doctor2Id, patientIds } = params;

  await prisma.ward.upsert({
    where: { id: WARD_ID },
    update: { name: 'General Ward', type: 'GENERAL', clinicId },
    create: {
      id: WARD_ID,
      name: 'General Ward',
      type: 'GENERAL',
      floorNumber: '1',
      clinicId,
    },
  });

  await Promise.all(
    ROOMS.map((room) =>
      prisma.room.upsert({
        where: { id: room.id },
        update: {
          wardId: WARD_ID,
          clinicId,
          roomNumber: room.number,
          type: room.type,
          charges: room.charges,
          chargesCents: Math.round(room.charges * 100),
        },
        create: {
          id: room.id,
          wardId: WARD_ID,
          clinicId,
          roomNumber: room.number,
          type: room.type,
          charges: room.charges,
          chargesCents: Math.round(room.charges * 100),
        },
      }),
    ),
  );

  await Promise.all(
    BEDS.map((bed) =>
      prisma.bed.upsert({
        where: { id: bed.id },
        update: {
          roomId: bed.roomId,
          clinicId,
          bedNumber: bed.bedNumber,
        },
        create: {
          id: bed.id,
          roomId: bed.roomId,
          clinicId,
          bedNumber: bed.bedNumber,
        },
      }),
    ),
  );

  const admissionPlans: Array<{
    id: string;
    patientIdx: number;
    bedId: string;
    doctorId: string;
    admitOffset: number;
    dischargeOffset: number | null;
    status: AdmissionStatus;
    reason: string;
    diagnosis: string;
    notes?: string;
  }> = [
    {
      id: 'seed-admission-rajesh-active',
      patientIdx: 0,
      bedId: BEDS[0].id,
      doctorId: doctor1Id,
      admitOffset: -2,
      dischargeOffset: null,
      status: AdmissionStatus.ADMITTED,
      reason: 'Diabetic ketoacidosis observation',
      diagnosis: 'DKA, stable',
    },
    {
      id: 'seed-admission-vikram-active',
      patientIdx: 6,
      bedId: BEDS[4].id,
      doctorId: doctor1Id,
      admitOffset: -1,
      dischargeOffset: null,
      status: AdmissionStatus.ADMITTED,
      reason: 'Chest pain workup',
      diagnosis: 'Unstable angina',
    },
    {
      id: 'seed-admission-karan-discharged',
      patientIdx: 10,
      bedId: BEDS[2].id,
      doctorId: doctor1Id,
      admitOffset: -20,
      dischargeOffset: -15,
      status: AdmissionStatus.DISCHARGED,
      reason: 'COPD exacerbation',
      diagnosis: 'COPD, resolved acute episode',
      notes: 'Discharged on home nebulization; review in 2 weeks.',
    },
    {
      id: 'seed-admission-aishwarya-discharged',
      patientIdx: 23,
      bedId: BEDS[1].id,
      doctorId: doctor2Id,
      admitOffset: -45,
      dischargeOffset: -42,
      status: AdmissionStatus.DISCHARGED,
      reason: 'Severe anaemia, transfusion',
      diagnosis: 'Iron-deficiency anaemia',
      notes: 'Discharged stable, oral iron therapy.',
    },
    {
      id: 'seed-admission-prakash-discharged',
      patientIdx: 24,
      bedId: BEDS[3].id,
      doctorId: doctor2Id,
      admitOffset: -10,
      dischargeOffset: -7,
      status: AdmissionStatus.DISCHARGED,
      reason: 'Diabetic foot infection',
      diagnosis: 'Cellulitis, right foot',
      notes: 'IV antibiotics x 3 days, switched to oral.',
    },
  ];

  for (const plan of admissionPlans) {
    const patientId = patientIds[plan.patientIdx];
    if (!patientId) continue;
    const data = {
      patientId,
      bedId: plan.bedId,
      clinicId,
      admittedAt: dateOffset(plan.admitOffset),
      dischargedAt:
        plan.dischargeOffset !== null ? dateOffset(plan.dischargeOffset) : null,
      status: plan.status,
      reason: plan.reason,
      diagnosis: plan.diagnosis,
      notes: plan.notes ?? null,
      admittingDoctorId: plan.doctorId,
    };
    await prisma.admission.upsert({
      where: { id: plan.id },
      update: data,
      create: { id: plan.id, ...data },
    });
  }
}
