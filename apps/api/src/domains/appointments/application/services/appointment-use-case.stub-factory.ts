import { jest } from '@jest/globals';

/** One boundary for specs that construct {@link AppointmentService} manually. */
export function stubUseCase<T>(prototype: object): T {
  // `Object.create` is typed `any`, so the assignment narrows without a cast.
  const instance: T & { execute: jest.Mock } = Object.create(prototype);
  instance.execute = jest.fn();
  return instance;
}
