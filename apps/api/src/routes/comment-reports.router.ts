import { Router } from 'express';
import {
  commentReportInjector,
  CommentReportsService,
} from '@dans-coding-world/api-reports';
import { CommentReportsController } from '../controllers/reports/comment-reports.controller';

const commentReportsController = new CommentReportsController(
  commentReportInjector.get(CommentReportsService)
);

const commentReportsRouter = Router();

commentReportsRouter
  .route('/')
  .get(commentReportsController.getAll)
  .post(commentReportsController.create);

commentReportsRouter
  .route('/:id')
  .get(commentReportsController.get)
  .patch(commentReportsController.updateStatus)
  .delete(commentReportsController.delete);

export default commentReportsRouter;
