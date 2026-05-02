import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { UploadSessionSecretGuard } from './upload-session-secret.guard';
import { UploadsService } from '@/domains/documents/application/services/uploads.service';

function createContext(params: {
  id?: string;
  secret?: string | string[];
}): ExecutionContext {
  const headers: Record<string, string | string[]> = {};
  if (params.secret !== undefined) {
    headers['x-upload-secret'] = params.secret;
  }

  return {
    switchToHttp: () => ({
      getRequest: () => ({
        params:
          params.id !== undefined ? { id: params.id } : ({} as { id?: string }),
        headers,
      }),
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn(),
  } as unknown as ExecutionContext;
}

describe('UploadSessionSecretGuard', () => {
  let guard: UploadSessionSecretGuard;
  let assertReadyForUpload: jest.Mock<
    (...args: unknown[]) => Promise<void | unknown>
  >;

  beforeEach(async () => {
    assertReadyForUpload = jest
      .fn<(...args: unknown[]) => Promise<void>>()
      .mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadSessionSecretGuard,
        {
          provide: UploadsService,
          useValue: { assertReadyForUpload },
        },
      ],
    }).compile();

    guard = module.get<UploadSessionSecretGuard>(UploadSessionSecretGuard);
  });

  it('throws Unauthorized when X-Upload-Secret is missing', async () => {
    await expect(
      guard.canActivate(createContext({ id: 'sess-1' })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(assertReadyForUpload).not.toHaveBeenCalled();
  });

  it('throws BadRequest when session id param is empty', async () => {
    await expect(
      guard.canActivate(createContext({ id: '   ', secret: 'x' })),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(assertReadyForUpload).not.toHaveBeenCalled();
  });

  it('delegates to UploadsService when id and secret are present', async () => {
    const ok = await guard.canActivate(
      createContext({ id: '  sess-1  ', secret: '  my-secret  ' }),
    );
    expect(ok).toBe(true);
    expect(assertReadyForUpload).toHaveBeenCalledWith('sess-1', 'my-secret');
  });
});
