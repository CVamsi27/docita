const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    if (isDevelopment) {
      console.info(`[INFO] ${message}`, context ?? '');
    }
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    if (isDevelopment) {
      console.warn(`[WARN] ${message}`, context ?? '');
    }
  },
  error: (message: string, context?: Record<string, unknown> | unknown) => {
    if (isDevelopment) {
      console.error(`[ERROR] ${message}`, context ?? '');
    }
  },
};
