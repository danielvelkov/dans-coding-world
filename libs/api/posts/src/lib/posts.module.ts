import { Provider, ReflectiveInjector } from 'injection-js';
import {
  USER_REPOSITORY_TOKEN,
  POST_REPOSITORY_TOKEN,
  PostsService,
} from './services/posts.service.js';
import {
  PrismaPostCommentsDataAccess,
  PrismaPostDataAccess,
  PrismaPostTagsDataAccess,
} from '@dans-coding-world/post-data-access';
import { PrismaUserDataAccess } from '@dans-coding-world/user-data-access';
import {
  COMMENT_REPOSITORY_TOKEN,
  CommentsService,
} from './services/comments.service.js';
import { TAG_REPOSITORY_TOKEN, TagsService } from './services/tags.service.js';

const postProviders: Provider[] = [
  PostsService,
  CommentsService,
  TagsService,
  { provide: POST_REPOSITORY_TOKEN, useClass: PrismaPostDataAccess },
  { provide: COMMENT_REPOSITORY_TOKEN, useClass: PrismaPostCommentsDataAccess },
  { provide: TAG_REPOSITORY_TOKEN, useClass: PrismaPostTagsDataAccess },
  { provide: USER_REPOSITORY_TOKEN, useClass: PrismaUserDataAccess },
];
export const postInjector = ReflectiveInjector.resolveAndCreate(postProviders);
