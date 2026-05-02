import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { bypassesSessionGuards } from './auth-route-metadata.util';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (bypassesSessionGuards(this.reflector, context)) {
      return true;
    }
    return super.canActivate(context);
  }
}
