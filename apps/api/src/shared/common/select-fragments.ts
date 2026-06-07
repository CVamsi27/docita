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

const INVOICE_COMMON_SELECT = {
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
  totalCents: true,
  subtotalCents: true,
  discountTotalCents: true,
  taxTotalCents: true,
  grandTotalCents: true,
} as const;

export const INVOICE_CARD_SELECT = {
  ...INVOICE_COMMON_SELECT,
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
  ...INVOICE_COMMON_SELECT,
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

export const DOCTOR_DETAIL_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  clinicId: true,
  specialization: true,
  hospitalRole: true,
  qualification: true,
  registrationNumber: true,
  licenseNumber: true,
  licenseExpiry: true,
  signatureUrl: true,
  signatureUploadedAt: true,
  verificationStatus: true,
  verificationSource: true,
  verificationRef: true,
  verificationReason: true,
  verificationData: true,
  verificationCheckedAt: true,
  profilePhotoUrl: true,
  phoneNumber: true,
  bio: true,
  yearsOfExperience: true,
  consultationFee: true,
  createdAt: true,
  updatedAt: true,
  educationHistory: {
    orderBy: { order: 'asc' },
  },
  certifications: {
    orderBy: { issueDate: 'desc' },
  },
  additionalSpecializations: true,
} as const;

export const PATIENT_ANALYTICS_SELECT = {
  createdAt: true,
} as const;
