import { LabTestOrderStatus, PrismaClient } from '@workspace/db';

interface SeedSchedulesAndLabTestsParams {
  clinicId: string;
  adminDoctorId: string;
  doctor1Id: string;
  doctor2Id: string;
  doctor3Id: string;
  patientIds: string[];
}

export async function seedSchedulesAndLabTests(
  prisma: PrismaClient,
  params: SeedSchedulesAndLabTestsParams,
): Promise<void> {
  const {
    clinicId,
    adminDoctorId,
    doctor1Id,
    doctor2Id,
    doctor3Id,
    patientIds,
  } = params;

  const daysOfWeek = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
  ] as const;

  await prisma.doctorSchedule.deleteMany({
    where: {
      doctorId: { in: [adminDoctorId, doctor1Id, doctor2Id, doctor3Id] },
    },
  });

  await prisma.labTest.deleteMany({
    where: { clinicId },
  });

  await prisma.doctorSchedule.createMany({
    data: [
      ...daysOfWeek.map((day) => ({
        doctorId: adminDoctorId,
        clinicId,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: day === 'SATURDAY' ? '14:00' : '18:00',
        slotDuration: 30,
        isActive: true,
      })),
      ...daysOfWeek.map((day) => ({
        doctorId: doctor1Id,
        clinicId,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: day === 'SATURDAY' ? '13:00' : '20:00',
        slotDuration: 30,
        isActive: true,
      })),
      ...daysOfWeek.slice(0, 5).map((day) => ({
        doctorId: doctor2Id,
        clinicId,
        dayOfWeek: day,
        startTime: '10:00',
        endTime: '14:00',
        slotDuration: 20,
        isActive: true,
      })),
      ...(['MONDAY', 'WEDNESDAY', 'FRIDAY'] as const).map((day) => ({
        doctorId: doctor3Id,
        clinicId,
        dayOfWeek: day,
        startTime: '11:00',
        endTime: '18:00',
        slotDuration: 45,
        isActive: true,
      })),
    ],
  });

  await prisma.labTest.createMany({
    data: [
      {
        clinicId,
        name: 'Complete Blood Count (CBC)',
        code: 'LAB001',
        category: 'Hematology',
        price: 350,
        specimenType: 'Blood',
        collectionRequirements: 'No fasting required',
      },
      {
        clinicId,
        name: 'Lipid Profile',
        code: 'LAB002',
        category: 'Biochemistry',
        price: 600,
        specimenType: 'Blood',
        collectionRequirements: '12 hours fasting required',
      },
      {
        clinicId,
        name: 'Blood Glucose Fasting',
        code: 'LAB003',
        category: 'Biochemistry',
        price: 100,
        specimenType: 'Blood',
        collectionRequirements: '8-12 hours fasting required',
        referenceRangeLow: 70,
        referenceRangeHigh: 100,
        referenceRangeUnit: 'mg/dL',
      },
      {
        clinicId,
        name: 'HbA1c',
        code: 'LAB004',
        category: 'Biochemistry',
        price: 500,
        specimenType: 'Blood',
        collectionRequirements: 'No fasting required',
        referenceRangeLow: 4,
        referenceRangeHigh: 5.6,
        referenceRangeUnit: '%',
      },
      {
        clinicId,
        name: 'Thyroid Profile (T3, T4, TSH)',
        code: 'LAB005',
        category: 'Endocrinology',
        price: 800,
        specimenType: 'Blood',
        collectionRequirements: 'No fasting required',
      },
      {
        clinicId,
        name: 'Urine Routine',
        code: 'LAB006',
        category: 'Urinalysis',
        price: 150,
        specimenType: 'Urine',
        collectionRequirements: 'Mid-stream clean catch sample',
      },
      {
        clinicId,
        name: 'Liver Function Test (LFT)',
        code: 'LAB007',
        category: 'Biochemistry',
        price: 700,
        specimenType: 'Blood',
        collectionRequirements: '10-12 hours fasting preferred',
      },
      {
        clinicId,
        name: 'Kidney Function Test (KFT)',
        code: 'LAB008',
        category: 'Biochemistry',
        price: 650,
        specimenType: 'Blood',
        collectionRequirements: 'No fasting required',
      },
    ],
  });

  await seedLabTestOrders(prisma, clinicId, adminDoctorId, patientIds);
}

const LAB_ORDER_PLAN: Array<{
  status: LabTestOrderStatus;
  orderedDaysAgo: number;
}> = [
  { status: LabTestOrderStatus.COMPLETED, orderedDaysAgo: 5 },
  { status: LabTestOrderStatus.COMPLETED, orderedDaysAgo: 4 },
  { status: LabTestOrderStatus.COMPLETED, orderedDaysAgo: 3 },
  { status: LabTestOrderStatus.RESULT_READY, orderedDaysAgo: 2 },
  { status: LabTestOrderStatus.RESULT_READY, orderedDaysAgo: 1 },
  { status: LabTestOrderStatus.SAMPLE_COLLECTED, orderedDaysAgo: 1 },
  { status: LabTestOrderStatus.SAMPLE_COLLECTED, orderedDaysAgo: 0 },
  { status: LabTestOrderStatus.PENDING, orderedDaysAgo: 0 },
  { status: LabTestOrderStatus.ORDERED, orderedDaysAgo: 0 },
  { status: LabTestOrderStatus.ORDERED, orderedDaysAgo: 0 },
];

/**
 * Lab orders across the workflow statuses so the Lab Tests worklist and its
 * Pending / In-progress / Completed stat cards show real data on camera
 * instead of an empty "No lab tests found" state.
 */
async function seedLabTestOrders(
  prisma: PrismaClient,
  clinicId: string,
  orderedBy: string,
  patientIds: string[],
): Promise<void> {
  if (patientIds.length === 0) return;

  const labTests = await prisma.labTest.findMany({
    where: { clinicId },
    select: { id: true },
    orderBy: { code: 'asc' },
  });
  if (labTests.length === 0) return;

  const dayMs = 24 * 60 * 60 * 1000;
  for (let i = 0; i < LAB_ORDER_PLAN.length; i++) {
    const plan = LAB_ORDER_PLAN[i];
    const orderedAt = new Date(Date.now() - plan.orderedDaysAgo * dayMs);
    const collected =
      plan.status === LabTestOrderStatus.ORDERED ||
      plan.status === LabTestOrderStatus.PENDING
        ? null
        : new Date(orderedAt.getTime() + dayMs / 2);
    const completed =
      plan.status === LabTestOrderStatus.COMPLETED ||
      plan.status === LabTestOrderStatus.RESULT_READY
        ? new Date(orderedAt.getTime() + dayMs)
        : null;
    const data = {
      clinicId,
      patientId: patientIds[i % patientIds.length],
      labTestId: labTests[i % labTests.length].id,
      status: plan.status,
      orderedBy,
      collectedAt: collected,
      completedAt: completed,
      createdAt: orderedAt,
    };
    await prisma.labTestOrder.upsert({
      where: { id: `seed-laborder-${i.toString().padStart(2, '0')}` },
      update: data,
      create: { id: `seed-laborder-${i.toString().padStart(2, '0')}`, ...data },
    });
  }
}
