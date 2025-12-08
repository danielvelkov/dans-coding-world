import { Provider, ReflectiveInjector } from 'injection-js';
import { USER_REPOSITORY_TOKEN, UserService } from './services/user.service.js';
import { PrismaUserDataAccess } from '@dans-coding-world/user-data-access';

const userProviders: Provider[] = [
  UserService,
  { provide: USER_REPOSITORY_TOKEN, useClass: PrismaUserDataAccess },
];
export const userInjector = ReflectiveInjector.resolveAndCreate(userProviders);
