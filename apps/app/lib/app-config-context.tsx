"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";

// Types for config options
export interface SelectOption {
  value: string;
  label: string;
  color?: string;
  short?: string;
}

export interface DurationOption {
  value: number;
  label: string;
}

export interface PatientImportField {
  field: string;
  label: string;
  required: boolean;
  type: string;
  options?: SelectOption[];
}

export interface CurrencyOption {
  value: string;
  label: string;
  symbol: string;
}

export interface FormOptions {
  gender: SelectOption[];
  bloodGroup: SelectOption[];
  appointmentType: SelectOption[];
  appointmentStatus: SelectOption[];
  invoiceStatus: SelectOption[];
  paymentStatus: SelectOption[];
  userRole: SelectOption[];
  weekday: SelectOption[];
  customFieldType: SelectOption[];
  templateFieldType: SelectOption[];
  specialty: SelectOption[];
  documentType: SelectOption[];
  appointmentDuration: DurationOption[];
  whatsappMessageType: SelectOption[];
  currency: CurrencyOption[];
  timezone: SelectOption[];
}

export interface DefaultValues {
  appointmentDuration: number;
  consultationFee: number;
  currency: string;
  timezone: string;
  invoiceItems: Array<{ description: string; quantity: number; price: number }>;
}

export interface ClinicSettings {
  consultationFee: number;
  currency: string;
  timezone: string;
  appointmentDuration: number;
}

export interface AppConfig {
  formOptions: FormOptions;
  patientImportFields: PatientImportField[];
  defaults: DefaultValues;
  clinicSettings?: ClinicSettings;
}

// Default fallback values (should match backend)
const DEFAULT_FORM_OPTIONS: FormOptions = {
  gender: [
    { value: "MALE", label: "Male" },
    { value: "FEMALE", label: "Female" },
    { value: "OTHER", label: "Other" },
  ],
  bloodGroup: [
    { value: "A+", label: "A+" },
    { value: "A-", label: "A-" },
    { value: "B+", label: "B+" },
    { value: "B-", label: "B-" },
    { value: "AB+", label: "AB+" },
    { value: "AB-", label: "AB-" },
    { value: "O+", label: "O+" },
    { value: "O-", label: "O-" },
  ],
  appointmentType: [
    { value: "consultation", label: "Consultation" },
    { value: "follow-up", label: "Follow-up" },
    { value: "check-up", label: "Check-up" },
  ],
  appointmentStatus: [
    { value: "scheduled", label: "Scheduled", color: "purple" },
    { value: "confirmed", label: "Confirmed", color: "blue" },
    { value: "completed", label: "Completed", color: "green" },
    { value: "cancelled", label: "Cancelled", color: "red" },
  ],
  invoiceStatus: [
    { value: "pending", label: "Pending", color: "yellow" },
    { value: "paid", label: "Paid", color: "green" },
    { value: "overdue", label: "Overdue", color: "red" },
    { value: "cancelled", label: "Cancelled", color: "gray" },
  ],
  paymentStatus: [
    { value: "pending", label: "Pending", color: "yellow" },
    { value: "paid", label: "Paid", color: "green" },
    { value: "failed", label: "Failed", color: "red" },
  ],
  userRole: [
    { value: "DOCTOR", label: "Doctor" },
    { value: "RECEPTIONIST", label: "Receptionist" },
    { value: "ADMIN", label: "Admin" },
  ],
  weekday: [
    { value: "monday", label: "Monday", short: "Mon" },
    { value: "tuesday", label: "Tuesday", short: "Tue" },
    { value: "wednesday", label: "Wednesday", short: "Wed" },
    { value: "thursday", label: "Thursday", short: "Thu" },
    { value: "friday", label: "Friday", short: "Fri" },
    { value: "saturday", label: "Saturday", short: "Sat" },
    { value: "sunday", label: "Sunday", short: "Sun" },
  ],
  customFieldType: [
    { value: "text", label: "Text" },
    { value: "number", label: "Number" },
    { value: "select", label: "Select" },
    { value: "date", label: "Date" },
    { value: "checkbox", label: "Checkbox" },
  ],
  templateFieldType: [
    { value: "text", label: "Text" },
    { value: "number", label: "Number" },
    { value: "select", label: "Dropdown" },
    { value: "checkbox", label: "Checkbox" },
  ],
  specialty: [
    { value: "General", label: "General Practice" },
    { value: "Dental", label: "Dental" },
    { value: "Cardiology", label: "Cardiology" },
    { value: "Pediatrics", label: "Pediatrics" },
    { value: "Ophthalmology", label: "Ophthalmology" },
  ],
  documentType: [
    { value: "prescription", label: "Prescription" },
    { value: "lab_report", label: "Lab Report" },
    { value: "other", label: "Other" },
  ],
  appointmentDuration: [
    { value: 15, label: "15 minutes" },
    { value: 30, label: "30 minutes" },
    { value: 60, label: "1 hour" },
  ],
  whatsappMessageType: [
    { value: "reminder", label: "Appointment Reminder" },
    { value: "receipt", label: "Payment Receipt" },
    { value: "payment-link", label: "Payment Link" },
  ],
  currency: [
    { value: "INR", label: "Indian Rupee", symbol: "₹" },
    { value: "USD", label: "US Dollar", symbol: "$" },
  ],
  timezone: [{ value: "Asia/Kolkata", label: "India Standard Time (IST)" }],
};

const DEFAULT_VALUES: DefaultValues = {
  appointmentDuration: 30,
  consultationFee: 800,
  currency: "INR",
  timezone: "Asia/Kolkata",
  invoiceItems: [{ description: "Consultation Fee", quantity: 1, price: 800 }],
};

const DEFAULT_CONFIG: AppConfig = {
  formOptions: DEFAULT_FORM_OPTIONS,
  patientImportFields: [],
  defaults: DEFAULT_VALUES,
};

interface AppConfigContextType {
  config: AppConfig;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  // Convenience getters
  getFormOptions: <K extends keyof FormOptions>(key: K) => FormOptions[K];
  getDefault: <K extends keyof DefaultValues>(key: K) => DefaultValues[K];
  getClinicSetting: <K extends keyof ClinicSettings>(
    key: K,
  ) => ClinicSettings[K] | undefined;
}

const AppConfigContext = createContext<AppConfigContextType | undefined>(
  undefined,
);

interface AppConfigProviderProps {
  children: ReactNode;
  clinicId?: string;
}

export function AppConfigProvider({
  children,
  clinicId,
}: AppConfigProviderProps) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
      const url = clinicId
        ? `${apiUrl}/config?clinicId=${clinicId}`
        : `${apiUrl}/config`;

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch app configuration");
      }

      const data = await response.json();
      setConfig(data);
    } catch (err) {
      console.error("Failed to load app config:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
      // Keep using default config on error
    } finally {
      setIsLoading(false);
    }
  }, [clinicId]);

  // Use useEffect to trigger initial fetch
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const getFormOptions = useCallback(
    <K extends keyof FormOptions>(key: K): FormOptions[K] => {
      return config.formOptions[key];
    },
    [config],
  );

  const getDefault = useCallback(
    <K extends keyof DefaultValues>(key: K): DefaultValues[K] => {
      return config.defaults[key];
    },
    [config],
  );

  const getClinicSetting = useCallback(
    <K extends keyof ClinicSettings>(key: K): ClinicSettings[K] | undefined => {
      return config.clinicSettings?.[key];
    },
    [config],
  );

  return (
    <AppConfigContext.Provider
      value={{
        config,
        isLoading,
        error,
        refetch: fetchConfig,
        getFormOptions,
        getDefault,
        getClinicSetting,
      }}
    >
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  const context = useContext(AppConfigContext);
  if (context === undefined) {
    throw new Error("useAppConfig must be used within an AppConfigProvider");
  }
  return context;
}

// Convenience hook for form options
export function useFormOptions<K extends keyof FormOptions>(
  key: K,
): FormOptions[K] {
  const { getFormOptions } = useAppConfig();
  return getFormOptions(key);
}

// Convenience hook for defaults
export function useDefaultValue<K extends keyof DefaultValues>(
  key: K,
): DefaultValues[K] {
  const { getDefault } = useAppConfig();
  return getDefault(key);
}
