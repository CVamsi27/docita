import { DosageForm, SigCode } from '@workspace/db';

export const CHIEF_COMPLAINTS = [
  'Fever and cough for 3 days',
  'Intermittent headaches for 2 weeks',
  'Joint pain in both knees for 1 month',
  'Abdominal pain after meals',
  'Chest discomfort on exertion',
  'Skin rash on forearm',
  'Lower back pain for 1 week',
  'Fatigue and weight gain',
  'Recurrent sneezing and nasal discharge',
  'Insomnia for 2 weeks',
];

export const CONSULTATION_NOTES = [
  'Patient presents with acute symptoms. Vitals stable. No signs of distress. Examination unremarkable. Prescribed symptomatic treatment.',
  'Chronic condition follow-up. Patient reports compliance with current regimen. BP/BSL within target range. Continue current medications.',
  'New onset symptoms. Detailed history taken. Differential diagnoses considered. Investigations ordered. Will review results at follow-up.',
  'Post-procedure review. Wound healing well. No signs of infection. Patient reports pain 3/10. Medications adjusted.',
  'Routine health screening. All vitals normal. Lifestyle counselling provided. Discussed diet and exercise modifications.',
];

export const TREATMENT_PLANS = [
  'Continue current medications. Follow up in 2 weeks. Maintain food diary. Regular exercise 30 min/day.',
  'Medication adjusted based on latest labs. Follow up in 4 weeks. Low sodium diet. Monitor BP daily.',
  'Short course of antibiotics prescribed. Rest and fluids. Return if symptoms worsen. Follow up in 1 week.',
  'Physiotherapy referral made. Analgesics for pain relief. Avoid heavy lifting. Review in 2 weeks.',
  'Lifestyle modifications counselled. Weight management plan discussed. Follow up in 3 months for reassessment.',
];

export const CLINICAL_IMPRESSIONS = [
  'Viral upper respiratory infection. Supportive care advised.',
  'Essential hypertension, well-controlled on current medications.',
  'Musculoskeletal strain. Rule out osteoarthritis pending X-ray.',
  'Functional dyspepsia. PPI trial started.',
  'Generalized anxiety disorder. Started on low-dose anxiolytic.',
];

export const HPI_TEMPLATES = [
  'Symptoms started 3 days ago. Gradual onset. No aggravating factors identified. No similar episodes in the past.',
  'Chronic symptoms, fluctuating intensity. Better with rest, worse with activity. No radiation of pain.',
  'Intermittent symptoms for the past month. No associated fever, weight loss, or night sweats. No significant past history.',
  'Acute onset, severe intensity initially, now moderate. No relation to meals or time of day. No associated nausea.',
  'Progressive symptoms over 2 weeks. No relieving or aggravating factors identified. Patient anxious about symptoms.',
];

export interface MedicationTemplate {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  dosageForm: DosageForm;
  sigCode: SigCode;
  quantity: number;
  refillsAllowed: number;
}

export const MEDICATION_TEMPLATES: MedicationTemplate[] = [
  {
    name: 'Metformin',
    dosage: '500mg',
    frequency: 'Twice daily',
    duration: '30 days',
    route: 'Oral',
    dosageForm: 'TABLET',
    sigCode: 'BID',
    quantity: 60,
    refillsAllowed: 2,
  },
  {
    name: 'Amlodipine',
    dosage: '5mg',
    frequency: 'Once daily',
    duration: '30 days',
    route: 'Oral',
    dosageForm: 'TABLET',
    sigCode: 'QD',
    quantity: 30,
    refillsAllowed: 2,
  },
  {
    name: 'Atorvastatin',
    dosage: '10mg',
    frequency: 'At bedtime',
    duration: '30 days',
    route: 'Oral',
    dosageForm: 'TABLET',
    sigCode: 'QHS',
    quantity: 30,
    refillsAllowed: 2,
  },
  {
    name: 'Pantoprazole',
    dosage: '40mg',
    frequency: 'Before breakfast',
    duration: '14 days',
    route: 'Oral',
    dosageForm: 'TABLET',
    sigCode: 'QAM',
    quantity: 14,
    refillsAllowed: 0,
  },
  {
    name: 'Levothyroxine',
    dosage: '50mcg',
    frequency: 'Once daily',
    duration: '90 days',
    route: 'Oral',
    dosageForm: 'TABLET',
    sigCode: 'QD',
    quantity: 90,
    refillsAllowed: 3,
  },
  {
    name: 'Salbutamol Inhaler',
    dosage: '100mcg',
    frequency: 'As needed',
    duration: '30 days',
    route: 'Inhalation',
    dosageForm: 'INHALER',
    sigCode: 'PRN',
    quantity: 1,
    refillsAllowed: 1,
  },
  {
    name: 'Paracetamol',
    dosage: '500mg',
    frequency: 'Every 6 hours',
    duration: '5 days',
    route: 'Oral',
    dosageForm: 'TABLET',
    sigCode: 'Q6H',
    quantity: 20,
    refillsAllowed: 0,
  },
  {
    name: 'Azithromycin',
    dosage: '500mg',
    frequency: 'Once daily',
    duration: '5 days',
    route: 'Oral',
    dosageForm: 'TABLET',
    sigCode: 'QD',
    quantity: 5,
    refillsAllowed: 0,
  },
  {
    name: 'Cetirizine',
    dosage: '10mg',
    frequency: 'Once daily at night',
    duration: '7 days',
    route: 'Oral',
    dosageForm: 'TABLET',
    sigCode: 'QHS',
    quantity: 7,
    refillsAllowed: 0,
  },
  {
    name: 'Omeprazole',
    dosage: '20mg',
    frequency: 'Before breakfast',
    duration: '14 days',
    route: 'Oral',
    dosageForm: 'CAPSULE',
    sigCode: 'QAM',
    quantity: 14,
    refillsAllowed: 0,
  },
];

export interface SeedIcdCode {
  code: string;
  description: string;
  category: string;
}

/**
 * A small ICD-10 catalogue of common primary-care conditions, spread across
 * several body systems so the analytics "Top diagnoses" and "Disease
 * distribution" charts render with real data on camera instead of empty
 * states. Categories drive the distribution donut.
 */
export const SEED_ICD_CODES: SeedIcdCode[] = [
  {
    code: 'E11.9',
    description: 'Type 2 diabetes mellitus without complications',
    category: 'Endocrine',
  },
  {
    code: 'I10',
    description: 'Essential (primary) hypertension',
    category: 'Circulatory',
  },
  {
    code: 'J45.909',
    description: 'Unspecified asthma, uncomplicated',
    category: 'Respiratory',
  },
  {
    code: 'J06.9',
    description: 'Acute upper respiratory infection, unspecified',
    category: 'Respiratory',
  },
  { code: 'M54.5', description: 'Low back pain', category: 'Musculoskeletal' },
  {
    code: 'M17.9',
    description: 'Osteoarthritis of knee, unspecified',
    category: 'Musculoskeletal',
  },
  {
    code: 'K21.9',
    description: 'Gastro-oesophageal reflux disease without oesophagitis',
    category: 'Digestive',
  },
  {
    code: 'E78.5',
    description: 'Hyperlipidaemia, unspecified',
    category: 'Endocrine',
  },
  {
    code: 'E03.9',
    description: 'Hypothyroidism, unspecified',
    category: 'Endocrine',
  },
  {
    code: 'N39.0',
    description: 'Urinary tract infection, site not specified',
    category: 'Genitourinary',
  },
  {
    code: 'F41.9',
    description: 'Anxiety disorder, unspecified',
    category: 'Mental health',
  },
  { code: 'R51', description: 'Headache', category: 'Symptoms & signs' },
];

export const DIAGNOSIS_NOTES = [
  'Stable on current management; continue therapy.',
  'Symptoms improving since last visit.',
  'Newly diagnosed; treatment plan initiated.',
  'Reviewed labs; medication adjusted.',
  'Counselled on lifestyle modification.',
  'Follow-up advised in four weeks.',
];

export const FOLLOW_UP_REASONS = [
  'Review blood pressure and medication response',
  'Re-check fasting glucose and HbA1c',
  'Post-consultation symptom review',
  'Review lab results',
  'Medication titration follow-up',
  'Routine chronic-care review',
];

export function buildSeedVitals(index: number): {
  height: number;
  weight: number;
  bloodPressure: string;
  pulse: number;
  temperature: number;
  spo2: number;
} {
  const systolic = 110 + (index % 5) * 8;
  const diastolic = 70 + (index % 4) * 5;
  return {
    height: 160 + (index % 25),
    weight: 55 + (index % 30),
    bloodPressure: `${systolic}/${diastolic}`,
    pulse: 70 + (index % 15),
    temperature: 98.2 + (index % 4) * 0.2,
    spo2: 96 + (index % 4),
  };
}
