import {
  ConditionSourceType,
  ConditionSeverity,
  ConditionStatus,
  MedicalConditionType,
  PrismaClient,
} from '@workspace/db';

type SeedEntityRef = { id: string };

export async function seedStructuredMedicalHistory(
  prisma: PrismaClient,
  patients: SeedEntityRef[],
): Promise<void> {
  const patientIds = patients.map((patient) => patient.id);

  await clearStructuredMedicalHistory(prisma, patientIds);
  await seedMedicalConditions(prisma, patients);
  await seedAllergies(prisma, patients);
  await seedFamilyHistory(prisma, patients);
  await seedSocialHistory(prisma, patients);
  await seedSurgicalHistory(prisma, patients);
  await seedImmunizations(prisma, patients);
}

async function clearStructuredMedicalHistory(
  prisma: PrismaClient,
  patientIds: string[],
): Promise<void> {
  await Promise.all([
    prisma.patientMedicalCondition.deleteMany({
      where: { patientId: { in: patientIds } },
    }),
    prisma.patientAllergy.deleteMany({
      where: { patientId: { in: patientIds } },
    }),
    prisma.patientFamilyHistory.deleteMany({
      where: { patientId: { in: patientIds } },
    }),
    prisma.patientSocialHistory.deleteMany({
      where: { patientId: { in: patientIds } },
    }),
    prisma.patientSurgicalHistory.deleteMany({
      where: { patientId: { in: patientIds } },
    }),
    prisma.immunization.deleteMany({
      where: { patientId: { in: patientIds } },
    }),
  ]);
}

async function seedMedicalConditions(
  prisma: PrismaClient,
  patients: SeedEntityRef[],
): Promise<void> {
  await prisma.patientMedicalCondition.createMany({
    data: getMedicalConditionRows(patients),
  });
}

function getMedicalConditionRows(patients: SeedEntityRef[]) {
  return [
    {
      patientId: patients[0].id,
      conditionName: 'Type 2 Diabetes Mellitus',
      icdCode: 'E11',
      conditionType: MedicalConditionType.CHRONIC,
      status: ConditionStatus.MANAGED,
      severity: ConditionSeverity.MODERATE,
      diagnosedDate: new Date('2018-03-15'),
      notes: 'Well controlled with Metformin',
      sourceType: ConditionSourceType.MANUAL,
    },
    {
      patientId: patients[0].id,
      conditionName: 'Essential Hypertension',
      icdCode: 'I10',
      conditionType: MedicalConditionType.CHRONIC,
      status: ConditionStatus.MANAGED,
      severity: ConditionSeverity.MILD,
      diagnosedDate: new Date('2020-07-22'),
      notes: 'Controlled with Amlodipine 5mg',
      sourceType: ConditionSourceType.MANUAL,
    },
    {
      patientId: patients[1].id,
      conditionName: 'Bronchial Asthma',
      icdCode: 'J45',
      conditionType: MedicalConditionType.CHRONIC,
      status: ConditionStatus.ACTIVE,
      severity: ConditionSeverity.MODERATE,
      diagnosedDate: new Date('2015-05-10'),
      notes: 'Uses inhaler when needed',
      sourceType: ConditionSourceType.MANUAL,
    },
    {
      patientId: patients[2].id,
      conditionName: 'Rheumatoid Arthritis',
      icdCode: 'M06',
      conditionType: MedicalConditionType.AUTOIMMUNE,
      status: ConditionStatus.ACTIVE,
      severity: ConditionSeverity.MODERATE,
      diagnosedDate: new Date('2019-11-20'),
      sourceType: ConditionSourceType.MANUAL,
    },
    {
      patientId: patients[4].id,
      conditionName: 'Migraine without aura',
      icdCode: 'G43',
      conditionType: MedicalConditionType.CHRONIC,
      status: ConditionStatus.ACTIVE,
      severity: ConditionSeverity.MODERATE,
      diagnosedDate: new Date('2021-02-14'),
      sourceType: ConditionSourceType.MANUAL,
    },
  ];
}

async function seedAllergies(
  prisma: PrismaClient,
  patients: SeedEntityRef[],
): Promise<void> {
  await prisma.patientAllergy.createMany({
    data: [
      {
        patientId: patients[0].id,
        allergen: 'Penicillin',
        allergyType: 'DRUG',
        severity: 'SEVERE',
        reaction: 'Anaphylaxis, severe rash',
        isVerified: true,
        verifiedAt: new Date('2020-01-15'),
      },
      {
        patientId: patients[2].id,
        allergen: 'Sulfonamides',
        allergyType: 'DRUG',
        severity: 'MODERATE',
        reaction: 'Skin rash, itching',
        isVerified: true,
      },
      {
        patientId: patients[4].id,
        allergen: 'Latex',
        allergyType: 'LATEX',
        severity: 'MODERATE',
        reaction: 'Contact dermatitis',
        isVerified: true,
      },
      {
        patientId: patients[1].id,
        allergen: 'Peanuts',
        allergyType: 'FOOD',
        severity: 'LIFE_THREATENING',
        reaction: 'Anaphylaxis',
        isVerified: true,
      },
    ],
  });
}

async function seedFamilyHistory(
  prisma: PrismaClient,
  patients: SeedEntityRef[],
): Promise<void> {
  await prisma.patientFamilyHistory.createMany({
    data: [
      {
        patientId: patients[0].id,
        condition: 'Type 2 Diabetes',
        relationship: 'Father',
        ageAtOnset: 55,
      },
      {
        patientId: patients[0].id,
        condition: 'Hypertension',
        relationship: 'Mother',
        ageAtOnset: 50,
      },
      {
        patientId: patients[0].id,
        condition: 'Heart Disease',
        relationship: 'Grandfather (Paternal)',
        ageAtOnset: 65,
      },
      {
        patientId: patients[1].id,
        condition: 'Asthma',
        relationship: 'Mother',
        ageAtOnset: 30,
      },
      {
        patientId: patients[2].id,
        condition: 'Rheumatoid Arthritis',
        relationship: 'Sister',
        ageAtOnset: 45,
      },
    ],
  });
}

async function seedSocialHistory(
  prisma: PrismaClient,
  patients: SeedEntityRef[],
): Promise<void> {
  await prisma.patientSocialHistory.createMany({
    data: [
      {
        patientId: patients[0].id,
        smokingStatus: 'FORMER',
        smokingPackYears: 10,
        smokingQuitDate: new Date('2015-06-01'),
        alcoholUse: 'OCCASIONAL',
        alcoholFrequency: '1-2 drinks per week',
        occupation: 'Software Engineer',
        exerciseFrequency: '3-4 times per week',
        dietaryRestrictions: 'Low sugar diet',
      },
      {
        patientId: patients[1].id,
        smokingStatus: 'NEVER',
        alcoholUse: 'NONE',
        occupation: 'Teacher',
        exerciseFrequency: 'Daily yoga',
      },
      {
        patientId: patients[2].id,
        smokingStatus: 'CURRENT',
        smokingPackYears: 15,
        alcoholUse: 'MODERATE',
        alcoholFrequency: '3-4 drinks per week',
        occupation: 'Business Owner',
        occupationalHazards: 'Prolonged sitting',
      },
      {
        patientId: patients[3].id,
        smokingStatus: 'NEVER',
        alcoholUse: 'OCCASIONAL',
        occupation: 'Graphic Designer',
        exerciseFrequency: 'Gym 2-3 times per week',
      },
      {
        patientId: patients[4].id,
        smokingStatus: 'NEVER',
        alcoholUse: 'NONE',
        occupation: 'Accountant',
        exerciseFrequency: 'Walking daily',
        dietaryRestrictions: 'Vegetarian',
      },
    ],
  });
}

async function seedSurgicalHistory(
  prisma: PrismaClient,
  patients: SeedEntityRef[],
): Promise<void> {
  await prisma.patientSurgicalHistory.createMany({
    data: [
      {
        patientId: patients[0].id,
        procedureName: 'Appendectomy',
        procedureDate: new Date('2010-08-15'),
        hospital: 'Apollo Hospital, Bangalore',
        complications: 'None',
      },
      {
        patientId: patients[2].id,
        procedureName: 'Knee Arthroscopy',
        procedureDate: new Date('2020-03-20'),
        hospital: 'Manipal Hospital, Bangalore',
        surgeon: 'Dr. Suresh Orthopedics',
        notes: 'For meniscus tear repair',
      },
    ],
  });
}

async function seedImmunizations(
  prisma: PrismaClient,
  patients: SeedEntityRef[],
): Promise<void> {
  await prisma.immunization.createMany({
    data: [
      {
        patientId: patients[0].id,
        vaccineName: 'COVID-19 Vaccine (Covishield)',
        manufacturer: 'Serum Institute of India',
        administeredDate: new Date('2021-05-15'),
        site: 'LEFT_ARM',
        route: 'IM',
        doseNumber: 1,
        lotNumber: 'COV-21-0515-A',
      },
      {
        patientId: patients[0].id,
        vaccineName: 'COVID-19 Vaccine (Covishield)',
        manufacturer: 'Serum Institute of India',
        administeredDate: new Date('2021-07-15'),
        site: 'LEFT_ARM',
        route: 'IM',
        doseNumber: 2,
        seriesComplete: true,
        lotNumber: 'COV-21-0715-B',
      },
      {
        patientId: patients[1].id,
        vaccineName: 'Influenza Vaccine 2024-25',
        manufacturer: 'Sanofi',
        administeredDate: new Date('2024-10-01'),
        site: 'RIGHT_ARM',
        route: 'IM',
        doseNumber: 1,
        lotNumber: 'FLU-24-001',
      },
      {
        patientId: patients[3].id,
        vaccineName: 'Hepatitis B Vaccine',
        manufacturer: 'Bharat Biotech',
        administeredDate: new Date('2023-01-10'),
        site: 'LEFT_ARM',
        route: 'IM',
        doseNumber: 3,
        seriesComplete: true,
      },
    ],
  });
}
