import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { asType } from '@/test-utils/as-type';
import { WsJwtAuthGuard } from './ws-jwt-auth.guard';

function createWsContext(client: Record<string, unknown>): ExecutionContext {
  return asType<ExecutionContext>({
    switchToWs: (() => ({
      getClient: () => client,
      getData: () => undefined,
      getPattern: () => 'message',
    })) as ExecutionContext['switchToWs'],
  });
}

describe('WsJwtAuthGuard', () => {
  let jwtService: JwtService;
  let verifyAsyncMock: jest.MockedFunction<
    (token: string) => Promise<Record<string, unknown>>
  >;
  let guard: WsJwtAuthGuard;

  beforeEach(() => {
    verifyAsyncMock = jest.fn();
    jwtService = asType<JwtService>({
      verifyAsync: verifyAsyncMock as JwtService['verifyAsync'],
    });
    guard = new WsJwtAuthGuard(jwtService);
  });

  it('uses token from handshake auth and sets client user payload', async () => {
    const payload = { sub: 'user-1', role: 'DOCTOR' };
    const client: {
      handshake: { auth: { token: string }; headers: Record<string, unknown> };
      data: { user?: unknown };
    } = {
      handshake: { auth: { token: 'token-1' }, headers: {} },
      data: {},
    };
    verifyAsyncMock.mockResolvedValue(payload);

    await expect(guard.canActivate(createWsContext(client))).resolves.toBe(
      true,
    );
    expect(verifyAsyncMock).toHaveBeenCalledWith('token-1');
    expect(client.data.user).toEqual(payload);
  });

  it('falls back to authorization header token', async () => {
    const payload = { sub: 'user-2', role: 'ADMIN' };
    const client: {
      handshake: {
        auth: Record<string, unknown>;
        headers: { authorization: string };
      };
      data: { user?: unknown };
    } = {
      handshake: {
        auth: {},
        headers: { authorization: 'Bearer token-2' },
      },
      data: {},
    };
    verifyAsyncMock.mockResolvedValue(payload);

    await expect(guard.canActivate(createWsContext(client))).resolves.toBe(
      true,
    );
    expect(verifyAsyncMock).toHaveBeenCalledWith('token-2');
    expect(client.data.user).toEqual(payload);
  });

  it('throws unauthorized when token is missing', async () => {
    const client = {
      handshake: {
        auth: {},
        headers: {},
      },
      data: {},
    };

    await expect(guard.canActivate(createWsContext(client))).rejects.toThrow(
      WsException,
    );

    try {
      await guard.canActivate(createWsContext(client));
    } catch (error) {
      expect((error as WsException).getError()).toBe('Unauthorized');
    }
  });

  it('throws unauthorized when token verification fails', async () => {
    const client = {
      handshake: { auth: { token: 'bad-token' }, headers: {} },
      data: {},
    };
    verifyAsyncMock.mockRejectedValue(new Error('invalid token'));

    await expect(guard.canActivate(createWsContext(client))).rejects.toThrow(
      WsException,
    );
  });
});
