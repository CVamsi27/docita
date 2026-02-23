import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient<Socket>();
      const authToken =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!authToken) {
        throw new WsException('Missing authentication token');
      }

      const payload = await this.jwtService.verifyAsync(authToken);
      // Attach user to client for use in handlers
      client.data.user = payload;

      return true;
    } catch (err) {
      throw new WsException('Unauthorized');
    }
  }
}
