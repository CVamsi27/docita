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
      conditionName: true,
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
      relationship: true,
      condition: true,
      ageAtOnset: true,
      notes: true,
    },
    orderBy: { createdAt: 'desc' },
  },
  socialHistory: {
    select: {
      id: true,
      smokingStatus: true,
      smokingPackYears: true,
      smokingQuitDate: true,
      alcoholUse: true,
      alcoholFrequency: true,
      substanceUse: true,
      occupation: true,
      occupationalHazards: true,
      exerciseFrequency: true,
      dietaryRestrictions: true,
      notes: true,
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

export const APPOINTMENT_LIST_SELECT = {
  id: true,
  startTime: true,
  endTime: true,
  status: true,
  type: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const APPOINTMENT_CARD_SELECT = {
  id: true,
  startTime: true,
  endTime: true,
  status: true,
  type: true,
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

export const APPOINTMENT_DETAIL_SELECT = {
  id: true,
  startTime: true,
  endTime: true,
  status: true,
  type: true,
  notes: true,
  consultationNotes: true,
  chiefComplaint: true,
  clinicalImpression: true,
  differentialDiagnosis: true,
  finalDiagnosis: true,
  followUpPlan: true,
  generalExamination: true,
  historyOfPresentIllness: true,
  investigations: true,
  observations: true,
  provisionalDiagnosis: true,
  reviewOfSystems: true,
  systemicExamination: true,
  treatmentPlan: true,
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
      spo2: true,
      weight: true,
      height: true,
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

export const DOCTOR_LIST_SELECT = {
  id: true,
  role: true,
  name: true,
  email: true,
  specialization: true,
  hospitalRole: true,
  qualification: true,
  phoneNumber: true,
  createdAt: true,
} as const;

export const DOCTOR_CARD_SELECT = {
  id: true,
  role: true,
  name: true,
  email: true,
  specialization: true,
  hospitalRole: true,
  qualification: true,
  registrationNumber: true,
  registrationCouncil: true,
  registrationStateCode: true,
  verificationStatus: true,
  verificationReason: true,
  verificationCheckedAt: true,
  signatureUrl: true,
  phoneNumber: true,
  profilePhotoUrl: true,
  yearsOfExperience: true,
  consultationFee: true,
  createdAt: true,
} as const;

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

export const INVOICE_LIST_SELECT = {
  id: true,
  clinicId: true,
  invoiceNumber: true,
  invoiceType: true,
  currency: true,
  total: true,
  subtotal: true,
  discountTotal: true,
  taxTotal: true,
  grandTotal: true,
  status: true,
  items: true,
  issuedAt: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const INVOICE_CARD_SELECT = {
  id: true,
  clinicId: true,
  invoiceNumber: true,
  invoiceType: true,
  currency: true,
  total: true,
  subtotal: true,
  discountTotal: true,
  taxTotal: true,
  grandTotal: true,
  status: true,
  items: true,
  issuedAt: true,
  dueDate: true,
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

export const INVOICE_DETAIL_SELECT = {
  id: true,
  patientId: true,
  clinicId: true,
  invoiceNumber: true,
  invoiceType: true,
  currency: true,
  total: true,
  subtotal: true,
  discountTotal: true,
  taxTotal: true,
  grandTotal: true,
  taxSummary: true,
  sellerTaxSnapshot: true,
  buyerTaxSnapshot: true,
  placeOfSupplyStateCode: true,
  placeOfSupplyStateName: true,
  reverseCharge: true,
  issuedAt: true,
  dueDate: true,
  eInvoiceRequired: true,
  eInvoiceIrn: true,
  eInvoiceQrCode: true,
  eInvoiceAcknowledgedAt: true,
  status: true,
  items: true,
  doctorName: true,
  doctorEmail: true,
  doctorPhone: true,
  doctorSpecialization: true,
  doctorRegistrationNumber: true,
  createdAt: true,
  updatedAt: true,
  pdfUrl: true,
  pdfGeneratedAt: true,
  pdfTemplateVersion: true,
  whatsappStatus: true,
  whatsappSentAt: true,
  whatsappMessageId: true,
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
          logo: true,
          currency: true,
          branding: true,
          slaSignatureUrl: true,
          settings: true,
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
        },
      },
      diagnoses: {
        select: {
          isPrimary: true,
          icdCode: {
            select: { code: true, description: true, version: true },
          },
        },
      },
      procedures: {
        select: {
          description: true,
          cptCode: {
            select: { code: true, description: true },
          },
        },
      },
    },
  },
} as const;

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

export const INVOICE_ANALYTICS_SELECT = {
  total: true,
  createdAt: true,
} as const;

export const PATIENT_ANALYTICS_SELECT = {
  createdAt: true,
} as const;

export const APPOINTMENT_ANALYTICS_SELECT = {
  status: true,
  type: true,
  createdAt: true,
} as const;

export const PRESCRIPTION_LIST_SELECT = {
  id: true,
  date: true,
  instructions: true,
  createdAt: true,
} as const;

export const PRESCRIPTION_CARD_SELECT = {
  id: true,
  date: true,
  instructions: true,
  medications: true,
  createdAt: true,
  whatsappStatus: true,
  whatsappSentAt: true,
  patient: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
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

export const PRESCRIPTION_DETAIL_SELECT = {
  id: true,
  date: true,
  instructions: true,
  medications: true,
  followUpDate: true,
  diagnosisNotes: true,
  createdAt: true,
  updatedAt: true,
  whatsappStatus: true,
  whatsappSentAt: true,
  whatsappMessageId: true,
  patient: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      email: true,
      dateOfBirth: true,
      gender: true,
      allergies: true,
    },
  },
  doctor: {
    select: {
      id: true,
      name: true,
      email: true,
      specialization: true,
      registrationNumber: true,
      signatureUrl: true,
    },
  },
  appointment: {
    select: {
      id: true,
      startTime: true,
      type: true,
    },
  },
} as const;

export const USER_MINIMAL_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
} as const;

export const USER_LIST_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  phoneNumber: true,
  active: true,
  createdAt: true,
} as const;

export const USER_DETAIL_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  phoneNumber: true,
  active: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  clinic: {
    select: {
      id: true,
      name: true,
      tier: true,
      subscriptionStatus: true,
    },
  },
} as const;

export const VITAL_SIGN_SELECT = {
  id: true,
  systolicBP: true,
  diastolicBP: true,
  pulse: true,
  temperature: true,
  spo2: true,
  weight: true,
  height: true,
  bmi: true,
  respiratoryRate: true,
  createdAt: true,
} as const;
