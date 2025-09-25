import { ReflectiveInjector, Provider } from 'injection-js';
import {
  AuthService,
  USER_REPOSITORY_TOKEN,
  REFRESH_TOKEN_REPOSITORY_TOKEN,
} from './services/auth.service.js';
import { RegistrationService } from './services/registration.service.js';
import {
  TokenService,
  AUTH_CONFIG_TOKEN,
  TOKEN_SERVICE_TOKEN,
} from './services/token.service.js';
import { PrismaUserDataAccess as UserRepository } from '@dans-coding-world/user-data-access';
import { PrismaRefreshTokenDataAccess as RefreshTokenRepository } from '@dans-coding-world/token-data-access';
import { config } from './config/auth.config.js';

// Define providers
const authProviders: Provider[] = [
  AuthService,
  RegistrationService,
  { provide: TOKEN_SERVICE_TOKEN, useClass: TokenService },
  { provide: USER_REPOSITORY_TOKEN, useClass: UserRepository },
  { provide: REFRESH_TOKEN_REPOSITORY_TOKEN, useClass: RefreshTokenRepository },
  { provide: AUTH_CONFIG_TOKEN, useValue: config },
];

// Create injector
export const authInjector = ReflectiveInjector.resolveAndCreate(authProviders);
