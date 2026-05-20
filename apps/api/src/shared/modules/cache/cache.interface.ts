export interface ICacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  exists(key: string): Promise<boolean>;
  increment(key: string, by?: number): Promise<number>;
  decrement(key: string, by?: number): Promise<number>;
}

export interface CacheConfig {
  provider: 'memory' | 'redis';
  ttl: number;
}

export const CACHE_PROVIDER = Symbol('CACHE_PROVIDER');

export class CacheKeys {
  static userById(userId: string) {
    return `user:${userId}`;
  }

  static userByEmail(email: string) {
    return `user:email:${email}`;
  }

  static clinicById(clinicId: string) {
    return `clinic:${clinicId}`;
  }

  static clinicSettings(clinicId: string) {
    return `clinic:${clinicId}:settings`;
  }

  static clinicSubscription(clinicId: string) {
    return `clinic:${clinicId}:subscription`;
  }

  static patientById(patientId: string) {
    return `patient:${patientId}`;
  }

  static patientsList(clinicId: string, page?: number) {
    return `patients:${clinicId}${page ? `:page:${page}` : ''}`;
  }

  static appointmentById(appointmentId: string) {
    return `appointment:${appointmentId}`;
  }

  static appointmentsList(clinicId: string, date?: string) {
    return `appointments:${clinicId}${date ? `:${date}` : ''}`;
  }

  static invoiceById(invoiceId: string) {
    return `invoice:${invoiceId}`;
  }

  static invoicesList(clinicId: string, status?: string) {
    return `invoices:${clinicId}${status ? `:${status}` : ''}`;
  }

  static featureFlag(flag: string) {
    return `feature:${flag}`;
  }

  static rateLimit(identifier: string, action: string) {
    return `ratelimit:${identifier}:${action}`;
  }

  static session(sessionId: string) {
    return `session:${sessionId}`;
  }

  static patientsByClinic(clinicId: string) {
    return `patients:${clinicId}:*`;
  }

  static appointmentsByClinic(clinicId: string) {
    return `appointments:${clinicId}:*`;
  }

  static invoicesByClinic(clinicId: string) {
    return `invoices:${clinicId}:*`;
  }
}
