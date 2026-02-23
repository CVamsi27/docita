/**
 * Cache Service Interface
 *
 * Abstraction for caching layer (Redis, in-memory, etc.)
 * Allows switching implementations without changing application code.
 */

export interface ICacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  exists(key: string): Promise<boolean>;
  increment(key: string, by?: number): Promise<number>;
  decrement(key: string, by?: number): Promise<number>;
}

/**
 * Cache Configuration
 */
export interface CacheConfig {
  provider: 'redis' | 'memory';
  ttl: number; // Default TTL in seconds
  host?: string;
  port?: number;
  password?: string;
}

/**
 * Cache key constants and builders
 */
export class CacheKeys {
  // User cache keys
  static userById(userId: string) {
    return `user:${userId}`;
  }

  static userByEmail(email: string) {
    return `user:email:${email}`;
  }

  // Clinic cache keys
  static clinicById(clinicId: string) {
    return `clinic:${clinicId}`;
  }

  static clinicSettings(clinicId: string) {
    return `clinic:${clinicId}:settings`;
  }

  static clinicSubscription(clinicId: string) {
    return `clinic:${clinicId}:subscription`;
  }

  // Patient cache keys
  static patientById(patientId: string) {
    return `patient:${patientId}`;
  }

  static patientsList(clinicId: string, page?: number) {
    return `patients:${clinicId}${page ? `:page:${page}` : ''}`;
  }

  // Appointment cache keys
  static appointmentById(appointmentId: string) {
    return `appointment:${appointmentId}`;
  }

  static appointmentsList(clinicId: string, date?: string) {
    return `appointments:${clinicId}${date ? `:${date}` : ''}`;
  }

  // Invoice cache keys
  static invoiceById(invoiceId: string) {
    return `invoice:${invoiceId}`;
  }

  static invoicesList(clinicId: string, status?: string) {
    return `invoices:${clinicId}${status ? `:${status}` : ''}`;
  }

  // Feature flag cache keys
  static featureFlag(flag: string) {
    return `feature:${flag}`;
  }

  // Rate limit cache keys
  static rateLimit(identifier: string, action: string) {
    return `ratelimit:${identifier}:${action}`;
  }

  // Session cache keys
  static session(sessionId: string) {
    return `session:${sessionId}`;
  }

  // Invalidate all keys matching prefix
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
