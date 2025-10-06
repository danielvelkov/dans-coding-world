import type { IUserRepository } from '@dans-coding-world/shared-data-access-interfaces';
import {
  Strategy as JwtStrategy,
  StrategyOptionsWithRequest,
  VerifyCallbackWithRequest,
} from 'passport-jwt';
import { Request } from 'express';
import { USER_REPOSITORY_TOKEN } from '../services/auth.service.js';
import { AUTH_CONFIG_TOKEN } from '../services/token.service.js';
import { Inject, Injectable } from 'injection-js';
import type { AuthConfiguration } from '../config/auth.config.js';
import { ACCESS_TOKEN_COOKIE } from '@dans-coding-world/shared-constants';

// This is the default strategy name for the 'passport-jwt' npm package
export const JWT_STRATEGY_NAME = 'jwt';

/**
 * @summary Passport JWT authentication strategy for validating access tokens from HTTP-only cookies.
 * @description This strategy extracts JWT access tokens from secure HTTP-only cookies and validates them
 * against the configured secret. Upon successful validation, it retrieves the associated user
 * from the repository and attaches it to the request object.
 *
 * @example
 * ```typescript
 * // Register the strategy with Passport
 * const jwtStrategy = injector.get(PassportJwtStrategy);
 * passport.use(JWT_STRATEGY_NAME, jwtStrategy.strategy);
 *
 */
@Injectable()
export class PassportJwtStrategy {
  public readonly strategy: JwtStrategy;

  constructor(
    @Inject(USER_REPOSITORY_TOKEN) private userRepository: IUserRepository,
    @Inject(AUTH_CONFIG_TOKEN) private authConfig: AuthConfiguration
  ) {
    const opts: StrategyOptionsWithRequest = {
      jwtFromRequest: this.setCookieExtractor,
      secretOrKey: this.authConfig.options.accessSecret,
      passReqToCallback: true,
    };

    this.strategy = new JwtStrategy(opts, this.verify.bind(this));
  }

  private verify: VerifyCallbackWithRequest = async (_, jwt_payload, done) => {
    try {
      const user = await this.userRepository.getById(jwt_payload.sub);

      if (user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    } catch (error) {
      console.error('JWT Strategy verification error:', error);
      return done(error, false);
    }
  };

  private setCookieExtractor(req: Request) {
    let token = null;
    if (req && req.cookies) {
      token = req.cookies[ACCESS_TOKEN_COOKIE];
    }
    return token;
  }
}
