

export interface FieldError {
  message: string;
  code?: string;
}

export interface FormValidationErrors {
  [field: string]: FieldError | string;
}

export interface ApiErrorResponse {
  status: number;
  detail: string;
  title: string;
  validationErrors?: FormValidationErrors;
  [key: string]: unknown;
}

export interface FormFieldState {
  value: string;
  error?: string;
  touched: boolean;
}
