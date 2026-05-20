import { jest } from '@jest/globals';

/** One cast boundary for specs that construct {@link AppointmentService} manually. */
export function stubUseCase<T extends { execute: jest.Mock }>(
  prototype: object,
): T {
  const instance = Object.create(prototype) as T;
  instance.execute = jest.fn();
  return instance;
}
