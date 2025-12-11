/**
 * Reusable Prisma select fragments for optimizing API responses
 * 
 * Purpose: Eliminate data bloat by defining minimal field selections for different use cases
 * 
 * Patterns:
 * - LIST: Minimal fields for table/list views (~500 bytes per record)
 * - DETAIL: Full object for edit/view pages (~2-5KB per record)
 * - CARD: Medium fields for dashboard cards (~1KB per record)
 * - EXPORT: All fields for CSV/PDF exports
 */

// ============================================================================
// PATIENT SELECT FRAGMENTS
// ============================================================================

/**
 * Patient list view - minimal fields for tables
 * @fields 7
 * @size ~500 bytes per record
 * @usage Patient lists, search results, quick lookups
 */
export const PATIENT_LIST_SELECT = {
  id: true,
  mrn: true,
  firstName: true,
  lastName: true,
  phoneNumber: true,
  dateOfBirth: true,
  gender: true,
  createdAt: true,
} as const;

/**
 * Patient card view - for dashboard cards and summaries
 * @fields 11
 * @size ~1KB per record
 * @usage Dashboard recent patients, appointment patient preview
 */
export const PATIENT_CARD_SELECT = {
  id: true,
  mrn: true,
  firstName: true,
  lastName: true,
  phoneNumber: true,
  email: true,
  dateOfBirth: true,
  gender: true,
  bloodGroup: true,
  allergies: true,
  createdAt: true,
} as const;

/**
 * Patient detail view - full object for edit/view pages
 * @fields 20+ (includes nested relations)
 * @size ~5-10KB per record
 * @usage Patient profile page, edit forms, medical history view
 */
export const PATIENT_DETAIL_SELECT = {
  id: true,
  mrn: true,
  firstName: true,
  lastName: true,
  preferredName: true,
  pronouns: true,
  phoneNumber: true,
  email: true,
  address: true,
  dateOfBirth: true,
  gender: true,
  bloodGroup: true,
  allergies: true,
  medicalHistory: true,
  race: true,
  ethnicity: true,
  preferredLanguage: true,
  maritalStatus: true,
  emergencyContactName: true,
  emergencyContactPhone: true,
  emergencyContactRelation: true,
  codeStatus: true,
  whatsappConsent: true,
  createdAt: true,
  updatedAt: true,
  medicalConditions: {
    select: {
      id: true,
      condition: true,
      diagnosedDate: true,
      status: true,
      notes: true,
    },
    orderBy: { createdAt: 'desc' },
  },
  patientAllergies: {
    select: {
      id: true,
      allergen: true,
      reaction: true,
      severity: true,
      notes: true,
    },
    orderBy: { createdAt: 'desc' },
  },
  familyHistory: {
    select: {
      id: true,
      relation: true,
      condition: true,
      ageAtDiagnosis: true,
      notes: true,
    },
    orderBy: { createdAt: 'desc' },
  },
  socialHistory: {
    select: {
      id: true,
      smokingStatus: true,
      alcoholUse: true,
      drugUse: true,
      occupation: true,
      livingArrangement: true,
    },
  },
  surgicalHistory: {
    select: {
      id: true,
      procedureName: true,
      procedureDate: true,
      hospital: true,
      surgeon: true,
      complications: true,
    },
    orderBy: { procedureDate: 'desc' },
  },
  tags: {
    select: {
      id: true,
      tag: true,
      color: true,
    },
  },
} as const;

// ============================================================================
// APPOINTMENT SELECT FRAGMENTS
// ============================================================================

/**
 * Appointment list view - minimal fields for tables
 * @fields 8
 * @size ~700 bytes per record
 * @usage Appointment lists, calendar views, schedules
 */
export const APPOINTMENT_LIST_SELECT = {
  id: true,
  startTime: true,
  endTime: true,
  status: true,
  type: true,
  reason: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Appointment card view - for dashboard and queue
 * @fields 12+ (includes minimal patient/doctor info)
 * @size ~1.5KB per record
 * @usage Dashboard appointments, queue management, today's schedule
 */
export const APPOINTMENT_CARD_SELECT = {
  id: true,
  startTime: true,
  endTime: true,
  status: true,
  type: true,
  reason: true,
  notes: true,
  createdAt: true,
  patient: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      dateOfBirth: true,
      gender: true,
    },
  },
  doctor: {
    select: {
      id: true,
      name: true,
      specialization: true,
    },
  },
} as const;

/**
 * Appointment detail view - full object for consultation page
 * @fields 25+ (includes full patient, doctor, vitals, prescription, diagnoses)
 * @size ~8-15KB per record
 * @usage Appointment detail page, consultation workflow
 */
export const APPOINTMENT_DETAIL_SELECT = {
  id: true,
  startTime: true,
  endTime: true,
  status: true,
  type: true,
  reason: true,
  notes: true,
  chiefComplaint: true,
  presentIllnessHistory: true,
  physicalExamination: true,
  plan: true,
  followUpDate: true,
  followUpInstructions: true,
  createdAt: true,
  updatedAt: true,
  patient: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      email: true,
      address: true,
      dateOfBirth: true,
      gender: true,
      bloodGroup: true,
      allergies: true,
      medicalHistory: true,
    },
  },
  doctor: {
    select: {
      id: true,
      name: true,
      email: true,
      specialization: true,
      qualification: true,
      registrationNumber: true,
    },
  },
  vitalSign: {
    select: {
      id: true,
      systolicBP: true,
      diastolicBP: true,
      pulse: true,
      temperature: true,
      respiratoryRate: true,
      spo2: true,
      weight: true,
      height: true,
      bmi: true,
    },
  },
  prescription: {
    select: {
      id: true,
      instructions: true,
      date: true,
      medications: true,
      createdAt: true,
    },
  },
  diagnoses: {
    select: {
      id: true,
      notes: true,
      isPrimary: true,
      icdCode: {
        select: {
          id: true,
          code: true,
          description: true,
          category: true,
        },
      },
    },
  },
  procedures: {
    select: {
      id: true,
      notes: true,
      cptCode: {
        select: {
          id: true,
          code: true,
          description: true,
          category: true,
          price: true,
        },
      },
    },
  },
  invoice: {
    select: {
      id: true,
      total: true,
      status: true,
    },
  },
} as const;

// ============================================================================
// DOCTOR SELECT FRAGMENTS
// ============================================================================

/**
 * Doctor list view - minimal fields for tables
 * @fields 8
 * @size ~600 bytes per record
 * @usage Doctor lists, staff directory, quick lookups
 */
export const DOCTOR_LIST_SELECT = {
  id: true,
  name: true,
  email: true,
  specialization: true,
  hospitalRole: true,
  qualification: true,
  phoneNumber: true,
  createdAt: true,
} as const;

/**
 * Doctor card view - for appointment selection and dashboard
 * @fields 12
 * @size ~1KB per record
 * @usage Appointment creation, doctor selection dropdowns
 */
export const DOCTOR_CARD_SELECT = {
  id: true,
  name: true,
  email: true,
  specialization: true,
  hospitalRole: true,
  qualification: true,
  registrationNumber: true,
  phoneNumber: true,
  profilePhotoUrl: true,
  yearsOfExperience: true,
  consultationFee: true,
  createdAt: true,
} as const;

/**
 * Doctor detail view - full profile
 * @fields 20+
 * @size ~3-5KB per record
 * @usage Doctor profile page, edit forms, detailed views
 */
export const DOCTOR_DETAIL_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  specialization: true,
  hospitalRole: true,
  qualification: true,
  registrationNumber: true,
  licenseNumber: true,
  licenseExpiry: true,
  signatureUrl: true,
  profilePhotoUrl: true,
  phoneNumber: true,
  bio: true,
  yearsOfExperience: true,
  consultationFee: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ============================================================================
// INVOICE SELECT FRAGMENTS
// ============================================================================

/**
 * Invoice list view - minimal fields for tables
 * @fields 6
 * @size ~400 bytes per record
 * @usage Invoice lists, payment history
 */
export const INVOICE_LIST_SELECT = {
  id: true,
  total: true,
  status: true,
  items: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Invoice card view - for dashboard and summaries
 * @fields 10+ (includes minimal patient info)
 * @size ~1KB per record
 * @usage Dashboard recent invoices, payment summaries
 */
export const INVOICE_CARD_SELECT = {
  id: true,
  total: true,
  status: true,
  items: true,
  createdAt: true,
  patient: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
    },
  },
} as const;

/**
 * Invoice detail view - full invoice for printing/PDF
 * @fields 20+ (includes full patient, doctor, clinic info - NO binary data)
 * @size ~5KB per record
 * @usage Invoice detail page, print preview, PDF generation
 * @note Excludes clinic.logo and doctor.signatureUrl - fetch separately when needed
 */
export const INVOICE_DETAIL_SELECT = {
  id: true,
  total: true,
  status: true,
  items: true,
  doctorName: true,
  doctorEmail: true,
  doctorPhone: true,
  doctorSpecialization: true,
  doctorRegistrationNumber: true,
  createdAt: true,
  updatedAt: true,
  patient: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      email: true,
      address: true,
      clinic: {
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          email: true,
          // logo: excluded - fetch separately when needed for PDF
        },
      },
    },
  },
  appointment: {
    select: {
      id: true,
      startTime: true,
      doctor: {
        select: {
          id: true,
          name: true,
          email: true,
          qualification: true,
          registrationNumber: true,
          // signatureUrl: excluded - fetch separately when needed for PDF
        },
      },
    },
  },
} as const;

// ============================================================================
// CLINIC SELECT FRAGMENTS
// ============================================================================

/**
 * Clinic list view - minimal fields for super-admin
 * @fields 8
 * @size ~800 bytes per record
 * @usage Super-admin clinic list, management dashboard
 */
export const CLINIC_LIST_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  tier: true,
  active: true,
  createdAt: true,
} as const;

/**
 * Clinic card view - includes counts
 * @fields 12+ (includes _count)
 * @size ~1KB per record
 * @usage Super-admin dashboard with statistics
 */
export const CLINIC_CARD_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  tier: true,
  active: true,
  subscriptionStatus: true,
  createdAt: true,
  _count: {
    select: {
      users: true,
      patients: true,
      appointments: true,
    },
  },
} as const;

/**
 * Clinic detail view - full clinic info
 * @fields 15+
 * @size ~3KB per record
 * @usage Clinic settings page, profile
 */
export const CLINIC_DETAIL_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  logo: true,
  tier: true,
  active: true,
  subscriptionStatus: true,
  subscriptionTier: true,
  subscriptionCurrentPeriodEnd: true,
  settings: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ============================================================================
// ANALYTICS SELECT FRAGMENTS (Minimal for aggregations)
// ============================================================================

/**
 * Invoice analytics - only fields needed for calculations
 * @fields 2
 * @size ~50 bytes per record
 * @usage Revenue calculations, analytics aggregations
 */
export const INVOICE_ANALYTICS_SELECT = {
  total: true,
  createdAt: true,
} as const;

/**
 * Patient analytics - only timestamp
 * @fields 1
 * @size ~20 bytes per record
 * @usage Growth calculations, patient count over time
 */
export const PATIENT_ANALYTICS_SELECT = {
  createdAt: true,
} as const;

/**
 * Appointment analytics - minimal fields
 * @fields 3
 * @size ~80 bytes per record
 * @usage Appointment statistics, status distribution
 */
export const APPOINTMENT_ANALYTICS_SELECT = {
  status: true,
  type: true,
  createdAt: true,
} as const;
