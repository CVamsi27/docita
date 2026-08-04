export interface FieldError {
  message: string;
  code?: string;
}

export interface FormValidationErrors {
  [field: string]: FieldError | string;
}

