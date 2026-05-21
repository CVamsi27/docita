import { jest } from '@jest/globals';

/** check-as-cast-density: allow-file — `Object.create(prototype)` stubs for manual {@link AppointmentService} specs. */
/** One cast boundary for specs that construct {@link AppointmentService} manually. */
export function stubUseCase<T>(prototype: object): T {
  const instance = Object.create(prototype) as T & { execute: jest.Mock };
  instance.execute = jest.fn();
  return instance;
}
