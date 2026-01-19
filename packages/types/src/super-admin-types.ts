// ClinicTier matches the Prisma enum
export type ClinicTierType = 'CAPTURE' | 'CORE' | 'PLUS' | 'PRO' | 'ENTERPRISE' | 'INTELLIGENCE';

export interface CreateClinicDto {
  name: string;
  email: string;
  phone: string;
  address: string;
  tier?: ClinicTierType;
  website?: string;
  mrnPrefix?: string;
  timezone?: string;
  adminEmail: string;
  adminName: string;
  adminPassword: string;
}

export interface CreateAdminDto {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  adminType: 'admin' | 'admin_doctor';
  qualification?: string;
  registrationNumber?: string;
  specialization?: string;
}

export interface UpdateAdminDto {
  name?: string;
  email?: string;
  phoneNumber?: string;
  adminType?: 'admin' | 'admin_doctor';
  qualification?: string;
  registrationNumber?: string;
  specialization?: string;
}

export interface UpdateClinicAIFeaturesDto {
  enabled?: boolean;
  features?: {
    predictiveAnalytics?: boolean;
    automatedDiagnosis?: boolean;
    patientInsights?: boolean;
    appointmentOptimization?: boolean;
    prescriptionAssistant?: boolean;
  };
}

export interface PaymentData {
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
}
