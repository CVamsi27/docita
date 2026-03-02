import { PrismaClient } from '@workspace/db';

interface SeedSchedulesAndLabTestsParams {
  clinicId: string;
  doctor1Id: string;
  doctor2Id: string;
  doctor3Id: string;
}

export async function seedSchedulesAndLabTests(
  prisma: PrismaClient,
  params: SeedSchedulesAndLabTestsParams,
): Promise<void> {
  const { clinicId, doctor1Id, doctor2Id, doctor3Id } = params;

  const daysOfWeek = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
  ] as const;

  await prisma.doctorSchedule.deleteMany({
    where: { doctorId: { in: [doctor1Id, doctor2Id, doctor3Id] } },
  });

  await prisma.doctorSchedule.createMany({
    data: [
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
}
