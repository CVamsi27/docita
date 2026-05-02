/// <reference types="jest" />

export interface MockBullJob<T = unknown> {
  id: string | number;
  data: T;
  opts?: {
    delay?: number;
    attempts?: number;
    backoff?: number | { type: string; delay: number };
    removeOnComplete?: boolean | number;
    removeOnFail?: boolean | number;
  };
  progress: (value: number) => Promise<void>;
  log: (message: string) => Promise<void>;
  update: (data: T) => Promise<void>;
  remove: () => Promise<void>;
  retry: () => Promise<void>;
  discard: () => Promise<void>;
  moveToCompleted: (
    returnValue?: Record<string, unknown>,
    ignoreLock?: boolean,
  ) => Promise<void>;
  moveToFailed: (err: Error, ignoreLock?: boolean) => Promise<void>;
}

export interface MockBullQueue<T = unknown> {
  add: jest.Mock<Promise<MockBullJob<T>>, [T] | [string, T]>;
  process: jest.Mock<void, [(job: MockBullJob<T>) => Promise<void>]>;
  getJob: jest.Mock<Promise<MockBullJob<T> | null>, [string | number]>;
  getJobs: jest.Mock<Promise<MockBullJob<T>[]>, [string[]]>;
  close: jest.Mock<Promise<void>, []>;
  pause: jest.Mock<Promise<void>, []>;
  resume: jest.Mock<Promise<void>, []>;
  empty: jest.Mock<Promise<void>, []>;
  clean: jest.Mock<Promise<string[]>, [number, string]>;
  obliterate: jest.Mock<Promise<void>, []>;
  on: jest.Mock<
    void,
    [
      string,
      (...args: Array<string | number | Record<string, unknown>>) => void,
    ]
  >;
  off: jest.Mock<
    void,
    [
      string,
      (...args: Array<string | number | Record<string, unknown>>) => void,
    ]
  >;
}

export interface MockPrismaDelegate<T = unknown> {
  findMany: jest.Mock<Promise<T[]>, [unknown]>;
  findFirst: jest.Mock<Promise<T | null>, [unknown]>;
  findUnique: jest.Mock<Promise<T | null>, [unknown]>;
  create: jest.Mock<Promise<T>, [unknown]>;
  update: jest.Mock<Promise<T>, [unknown]>;
  delete: jest.Mock<Promise<T>, [unknown]>;
  count: jest.Mock<Promise<number>, [unknown]>;
  upsert: jest.Mock<Promise<T>, [unknown]>;
  deleteMany: jest.Mock<Promise<{ count: number }>, [unknown]>;
  updateMany: jest.Mock<Promise<{ count: number }>, [unknown]>;
  aggregate: jest.Mock<Promise<unknown>, [unknown]>;
  groupBy: jest.Mock<Promise<unknown[]>, [unknown]>;
}

export interface MockPrismaClient {
  $connect: jest.Mock;
  $disconnect: jest.Mock;
  $executeRaw: jest.Mock;
  $queryRaw: jest.Mock;
  $transaction: jest.Mock;
  $use: jest.Mock;
  [model: string]: MockPrismaDelegate | jest.Mock;
}

export interface MockRequest {
  user?: {
    id: string;
    clinicId?: string;
    email?: string;
    role?: string;
    [key: string]: unknown;
  };
  body?: Record<string, unknown>;
  query?: Record<string, string>;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  _clinicScopedEmpty?: boolean;
}

export interface MockResponse {
  status: jest.Mock<MockResponse, [number]>;
  json: jest.Mock<MockResponse, [unknown]>;
  send: jest.Mock<MockResponse, [unknown]>;
  redirect: jest.Mock<MockResponse, [string] | [number, string]>;
  setHeader: jest.Mock<MockResponse, [string, string]>;
  cookie: jest.Mock<MockResponse, [string, string, unknown?]>;
  clearCookie: jest.Mock<MockResponse, [string]>;
}

export type MockedService<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? jest.Mock<R, A>
    : T[K];
};

export interface TestPatientData {
  id?: string;
  clinicId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phoneNumber: string;
  dateOfBirth?: Date | null;
  gender?: string | null;
  address?: string | null;
  active?: boolean;
}

export interface TestUserData {
  id?: string;
  clinicId?: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
  active?: boolean;
}

export interface TestAppointmentData {
  id?: string;
  clinicId: string;
  patientId: string;
  doctorId: string;
  scheduledAt: Date;
  status?: string;
  type?: string;
  duration?: number;
}
