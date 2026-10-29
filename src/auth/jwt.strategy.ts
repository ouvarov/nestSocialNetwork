import { ConfigService } from '@nestjs/config';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { Env } from '@/config/env.schema';

import { type AccessTokenPayload, toAccessTokenUser } from './access-token';
import type { AuthUser } from './current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService<Env, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_ACCESS_SECRET', { infer: true }),
    });
  }

  validate(payload: AccessTokenPayload): AuthUser {
    const user = toAccessTokenUser(payload);
    if (!user) throw new UnauthorizedException();

    return user;
  }
}
