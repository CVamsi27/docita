export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
}

export interface LabValues {
  glucose: string;
  hemoglobin: string;
  creatinine: string;
}

export interface Vitals {
  bp: string;
  pulse: string;
  temp: string;
  spO2: string;
  respiratoryRate: string;
  glucose: string;
}

export interface OCRFormData {
  firstName: string;
  lastName: string;
  age: string;
  gender: string;
  dateOfBirth: string;
  phoneNumber: string;
  email: string;
  address: string;
  bloodType: string;
  diagnosis: string;
  symptoms: string[];
  allergies: string[];
  medicalHistory: string[];
  medications: Medication[];
  labValues: LabValues;
  vitals: Vitals;
}
