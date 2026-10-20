import { ArgumentsHost, HttpStatus, BadRequestException } from '@nestjs/common';
import { AllExceptionsFilter } from './http-exception.filter';
import {
  ConflictDomainError,
  InvariantViolationError,
  NotFoundDomainError,
} from '@/shared/common/errors/domain.errors';

function createHost() {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const request = {
    method: 'POST',
    path: '/api/v1/test',
    headers: {},
    body: {},
    ip: '127.0.0.1',
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as ArgumentsHost;

  return { host, response };
}

describe('AllExceptionsFilter domain errors', () => {
  it('maps not-found domain errors to 404', () => {
    const { host, response } = createHost();
    const filter = new AllExceptionsFilter();

    filter.catch(new NotFoundDomainError('Patient not found'), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: HttpStatus.NOT_FOUND,
        detail: 'Patient not found',
        errorType: 'NotFoundDomainError',
      }),
    );
  });

  it('maps conflict domain errors to 409', () => {
    const { host, response } = createHost();
    const filter = new AllExceptionsFilter();

    filter.catch(new ConflictDomainError('Appointment overlaps'), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: HttpStatus.CONFLICT,
        detail: 'Appointment overlaps',
        errorType: 'ConflictDomainError',
      }),
    );
  });

  it('maps invariant violations to 422', () => {
    const { host, response } = createHost();
    const filter = new AllExceptionsFilter();

    filter.catch(
      new InvariantViolationError('Start time must be before end time'),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        detail: 'Start time must be before end time',
        errorType: 'InvariantViolationError',
      }),
    );
  });
});

describe('AllExceptionsFilter appointment overlap contract', () => {
  it('retains the typed overlap detail and start-time map through the production filter', () => {
    const { host, response } = createHost();
    new AllExceptionsFilter().catch(
      new BadRequestException({
        code: 'APPOINTMENT_OVERLAP',
        detail: 'Doctor has conflicting appointment',
        validationErrors: { startTime: 'Doctor has conflicting appointment' },
      }),
      host,
    );
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'about:blank',
        title: 'Bad Request',
        status: 400,
        code: 'APPOINTMENT_OVERLAP',
        detail: 'Doctor has conflicting appointment',
        validationErrors: { startTime: 'Doctor has conflicting appointment' },
      }),
    );
  });
});
