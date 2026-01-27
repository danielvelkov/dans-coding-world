import type { Request, Response } from 'express';
import {
  seedComments,
  seedPosts,
  seedReports,
  seedTags,
  seedUsers,
} from '@dans-coding-world/testing-setup';
import { Router } from 'express';

const testDataRouter = Router();

testDataRouter.post('/posts', async (req: Request, res: Response) => {
  const { clearExisting, useDefaults } = req.query;
  const posts = await seedPosts(req.body, {
    clearExisting: getOptionParam(clearExisting as string),
    useDefaults: getOptionParam(useDefaults as string),
  });

  res.status(200).json(posts);
});

testDataRouter.post('/users', async (req: Request, res: Response) => {
  const { clearExisting, useDefaults } = req.query;
  const users = await seedUsers(req.body, {
    clearExisting: getOptionParam(clearExisting as string),
    useDefaults: getOptionParam(useDefaults as string),
  });

  res.status(200).json(users);
});

testDataRouter.post('/comments', async (req: Request, res: Response) => {
  const { clearExisting, useDefaults } = req.query;
  const comments = await seedComments(req.body, {
    clearExisting: getOptionParam(clearExisting as string),
    useDefaults: getOptionParam(useDefaults as string),
  });

  return res.status(200).json(comments);
});

testDataRouter.post('/tags', async (req: Request, res: Response) => {
  const { clearExisting, useDefaults } = req.query;
  const tags = await seedTags(req.body, {
    clearExisting: getOptionParam(clearExisting as string),
    useDefaults: getOptionParam(useDefaults as string),
  });

  return res.status(200).json(tags);
});

testDataRouter.post('/reports', async (req: Request, res: Response) => {
  const { clearExisting, useDefaults } = req.query;
  const reports = await seedReports(req.body, {
    clearExisting: getOptionParam(clearExisting as string),
    useDefaults: getOptionParam(useDefaults as string),
  });

  return res.status(200).json(reports);
});

export default testDataRouter;

const getOptionParam = (param: string) =>
  param === undefined || param === '' ? undefined : param === 'true';
