import { Provider, ReflectiveInjector } from 'injection-js';
import { USER_REPOSITORY_TOKEN, UserService } from './services/user.service.js';
import { PrismaUserDataAccess } from '@dans-coding-world/user-data-access';
import {
  STORAGE_PROVIDER_TOKEN,
  storageInjector,
} from '@dans-coding-world/api-file-storage';

const userProviders: Provider[] = [
  UserService,
  { provide: USER_REPOSITORY_TOKEN, useClass: PrismaUserDataAccess },
  {
    provide: STORAGE_PROVIDER_TOKEN,
    useValue: storageInjector.get(STORAGE_PROVIDER_TOKEN),
  },
];
export const userInjector = ReflectiveInjector.resolveAndCreate(userProviders);
