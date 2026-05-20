import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@workspace/db';

export interface PrismaErrorMapping {
  status: HttpStatus;
  message: string;
  details: (error: Prisma.PrismaClientKnownRequestError) => Record<string, unknown>;
}

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
};

const toStringOrUndefined = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

export const PRISMA_KNOWN_ERROR_REGISTRY: Record<
  string,
  PrismaErrorMapping
> = {
  P1000: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message:
      'Database connection is unavailable. Please try again shortly.',
    details: () => ({ code: 'P1000' }),
  },
  P2002: {
    status: HttpStatus.CONFLICT,
    message: 'A record with this field already exists',
    details: (exception) => {
      const fields = toStringArray(exception.meta?.target);
      const conflictFields = fields.length > 0 ? fields : ['field'];
      return {
        field: conflictFields[0],
        constraint: 'unique',
      };
    },
  },
  P2014: {
    status: HttpStatus.BAD_REQUEST,
    message:
      'The change you are trying to make violates a required relation',
    details: () => ({ code: 'P2014' }),
  },
  P2016: {
    status: HttpStatus.NOT_FOUND,
    message:
      'The query interpretation could not be matched to the database schema',
    details: () => ({ code: 'P2016' }),
  },
  P2021: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'The table does not exist in the current database',
    details: () => ({ code: 'P2021' }),
  },
  P2025: {
    status: HttpStatus.NOT_FOUND,
    message: 'The requested record was not found',
    details: () => ({ code: 'P2025' }),
  },
  P2003: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Invalid reference: the related record does not exist',
    details: (exception) => ({
      field: toStringOrUndefined(exception.meta?.field_name) || 'unknown',
      code: 'P2003',
    }),
  },
  P2019: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Database input parsing error - malformed input data',
    details: () => ({ code: 'P2019' }),
  },
};

export function mapPrismaKnownRequestError(
  exception: Prisma.PrismaClientKnownRequestError,
): { status: HttpStatus; message: string; details: Record<string, unknown> } {
  const mapping = PRISMA_KNOWN_ERROR_REGISTRY[exception.code];
  if (!mapping) {
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Database error occurred',
      details: { code: exception.code },
    };
  }

  if (mapping.status === HttpStatus.CONFLICT) {
    const fields = toStringArray(exception.meta?.target);
    const conflictFields = fields.length > 0 ? fields : ['field'];
    return {
      status: mapping.status,
      message: `A record with this ${conflictFields.join(', ')} already exists`,
      details: mapping.details(exception),
    };
  }

  return {
    status: mapping.status,
    message: mapping.message,
    details: mapping.details(exception),
  };
}
