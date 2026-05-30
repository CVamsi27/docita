import { ForbiddenException } from '@nestjs/common';

type ForbiddenProblemBody = {
  message: string;
  code: string;
};

export function forbiddenProblem(
  code: string,
  message: string,
): ForbiddenException {
  return new ForbiddenException({
    code,
    message,
  } satisfies ForbiddenProblemBody);
}
