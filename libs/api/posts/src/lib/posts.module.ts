import { Provider, ReflectiveInjector } from 'injection-js';
import {
  USER_REPOSITORY_TOKEN,
  POST_REPOSITORY_TOKEN,
  PostsService,
} from './services/posts.service.js';
import { PrismaPostDataAccess } from '@dans-coding-world/post-data-access';
import { PrismaUserDataAccess } from '@dans-coding-world/user-data-access';

const postProviders: Provider[] = [
  PostsService,
  { provide: POST_REPOSITORY_TOKEN, useClass: PrismaPostDataAccess },
  { provide: USER_REPOSITORY_TOKEN, useClass: PrismaUserDataAccess },
];
export const postInjector = ReflectiveInjector.resolveAndCreate(postProviders);
