export type ApiClientError = {
  status?: number;
  data?: unknown;
  message?: string;
  code?: string;
  isNetworkError?: boolean;
};
