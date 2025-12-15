import { Provider, ReflectiveInjector } from 'injection-js';
import {
  STORAGE_PROVIDER_TOKEN,
  USER_REPOSITORY_TOKEN,
  UserService,
} from './services/user.service.js';
import { PrismaUserDataAccess } from '@dans-coding-world/user-data-access';
import { CloudinaryProvider } from '@dans-coding-world/api-file-storage';

const userProviders: Provider[] = [
  UserService,
  { provide: USER_REPOSITORY_TOKEN, useClass: PrismaUserDataAccess },
  { provide: STORAGE_PROVIDER_TOKEN, useClass: CloudinaryProvider },
];
export const userInjector = ReflectiveInjector.resolveAndCreate(userProviders);
