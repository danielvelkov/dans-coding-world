import { Provider, ReflectiveInjector } from 'injection-js';
import {
  USER_REPOSITORY_TOKEN,
  COMMENT_REPORTS_REPOSITORY_TOKEN,
  CommentReportsService,
} from './services/comment-reports.service.js';
import { PrismaUserDataAccess } from '@dans-coding-world/user-data-access';
import { PrismaCommentReportDataAccess } from '@dans-coding-world/report-data-access';

const commentReportProviders: Provider[] = [
  CommentReportsService,
  {
    provide: COMMENT_REPORTS_REPOSITORY_TOKEN,
    useClass: PrismaCommentReportDataAccess,
  },
  { provide: USER_REPOSITORY_TOKEN, useClass: PrismaUserDataAccess },
];
export const commentReportInjector =
  ReflectiveInjector.resolveAndCreate(commentReportProviders);
