/**
 * Core type definitions for the Docita application
 */

// ============================================================================
// User & Auth Types
// ============================================================================

export type UserRole = 'DOCTOR' | 'RECEPTIONIST' | 'ADMIN' | 'SUPER_ADMIN' | 'ADMIN_DOCTOR'

export interface User {
    id: string
    email: string
    name: string
    role: UserRole
    clinicId?: string
    createdAt: string
    updatedAt: string
}

// ============================================================================
// Patient Types
// ============================================================================

export type Gender = 'MALE' | 'FEMALE' | 'OTHER'

export interface Patient {
    id: string
    firstName: string
    lastName: string
    dateOfBirth: string
    gender: Gender
    phoneNumber: string
    email?: string
    address?: string
    bloodGroup?: string
    allergies?: string
    medicalHistory?: string
    tags?: string[]
    createdAt: string
    updatedAt: string
}

// ============================================================================
// Appointment Types
// ============================================================================

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show'

export interface Appointment {
    id: string
    patientId: string
    patient?: Patient
    doctorId: string
    doctor?: User
    clinicId: string
    type: string
    status: AppointmentStatus
    startTime: string
    endTime: string
    notes?: string
    prescription?: Prescription
    invoice?: Invoice
    createdAt: string
    updatedAt: string
}

// ============================================================================
// Prescription Types
// ============================================================================

export interface Medication {
    name: string
    dosage: string
    frequency: string
    duration: string
}

export interface Prescription {
    id: string
    appointmentId: string
    appointment?: Appointment
    patientId: string
    patient?: Patient
    doctorId: string
    doctor?: User
    medications: Medication[]
    instructions?: string
    createdAt: string
    updatedAt: string
}

export interface PrescriptionTemplate {
    id: string
    name: string
    userId: string
    user?: User
    medications: Medication[]
    instructions?: string
    createdAt: string
    updatedAt: string
}

// ============================================================================
// Invoice Types
// ============================================================================

export type InvoiceStatus = 'paid' | 'pending' | 'cancelled'
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'online'

export interface InvoiceItem {
    description: string
    quantity: number
    price: number
}

export interface Invoice {
    id: string
    appointmentId: string
    appointment?: Appointment
    patientId: string
    patient?: Patient
    clinicId: string
    items: InvoiceItem[]
    totalAmount: number
    status: InvoiceStatus
    paymentMethod?: PaymentMethod
    paidAt?: string
    createdAt: string
    updatedAt: string
}

// ============================================================================
// Template Types
// ============================================================================

export interface TemplateField {
    label: string
    type: 'text' | 'textarea' | 'number' | 'select'
    options?: string[]
    required?: boolean
}

export interface ClinicalTemplate {
    id: string
    name: string
    speciality: string
    fields: TemplateField[]
    createdAt: string
    updatedAt: string
}

// ============================================================================
// Document Types
// ============================================================================

export interface Document {
    id: string
    patientId: string
    patient?: Patient
    name: string
    type: string
    url: string
    uploadedAt: string
    createdAt: string
    updatedAt: string
}

// ============================================================================
// Clinic Types
// ============================================================================

export type ClinicTier = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'

export interface Clinic {
    id: string
    name: string
    address?: string
    phoneNumber?: string
    email?: string
    tier: ClinicTier
    logo?: string
    createdAt: string
    updatedAt: string
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
    data?: T
    error?: string
    message?: string
}

export interface PaginatedResponse<T> {
    data: T[]
    total: number
    page: number
    pageSize: number
}

// ============================================================================
// Form Types
// ============================================================================

export interface PatientFormData {
    firstName: string
    lastName: string
    dateOfBirth: string
    gender: Gender
    phoneNumber: string
    email?: string
    address?: string
    bloodGroup?: string
    allergies?: string
    medicalHistory?: string
}

export interface AppointmentFormData {
    patientId: string
    type: string
    scheduledAt: string
    notes?: string
}

export interface PrescriptionFormData {
    medications: Medication[]
    instructions?: string
}

export interface InvoiceFormData {
    items: InvoiceItem[]
    paymentMethod?: PaymentMethod
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface DashboardStats {
    totalPatients: number
    todayAppointments: number
    activePrescriptions: number
    pendingReports: number
}

export interface RecentActivity {
    id: string
    type: 'appointment' | 'prescription' | 'invoice'
    description: string
    timestamp: string
}

// ============================================================================
// Medical Coding Types
// ============================================================================

export interface IcdCode {
    id: string
    code: string
    description: string
    category: string
    version: string
    createdAt: string
    updatedAt: string
}

export interface CptCode {
    id: string
    code: string
    description: string
    category: string
    price: number
    createdAt: string
    updatedAt: string
}

export interface Diagnosis {
    id: string
    icdCodeId: string
    icdCode: IcdCode
    notes?: string
    isPrimary: boolean
    createdAt: string
}

export interface Procedure {
    id: string
    cptCodeId: string
    cptCode: CptCode
    notes?: string
    createdAt: string
    updatedAt: string
}

export interface DoctorFavoriteCode {
    id: string
    userId: string
    icdCodeId?: string
    icdCode?: IcdCode
    cptCodeId?: string
    cptCode?: CptCode
    createdAt: string
}
