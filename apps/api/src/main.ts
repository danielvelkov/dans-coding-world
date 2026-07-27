import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { ApiException } from '@dans-coding-world/exceptions';
import * as path from 'path';
import authRouter from './routes/auth.router.js';
import { ERROR_CODES } from '@dans-coding-world/shared-constants';
import swaggerUI from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';
import { responseWrapper } from './middlewares/response-wrapper.middleware.js';
import { errorHandler } from './middlewares/error-handler.middleware.js';
import usersRouter from './routes/users.router.js';
import postsRouter from './routes/posts.router.js';
import commentsRouter from './routes/comments.router.js';
import {
  authInjector,
  PassportJwtStrategy,
  JWT_STRATEGY_NAME,
} from '@dans-coding-world/api-auth';
import passport from 'passport';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import tagsRouter from './routes/tags.router.js';
import commentReportsRouter from './routes/comment-reports.router.js';
import testDataRouter from './routes/test-data.router.js';

const apiHost = process.env['API_HOST'];
const apiPort = process.env['API_PORT'];

const publicBlogHost = process.env['VITE_PUBLIC_BLOG_HOST'];
const publicBlogPort = process.env['VITE_PUBLIC_BLOG_PORT'];

const adminBlogHost = process.env['VITE_ADMIN_BLOG_HOST'];
const adminBlogPort = process.env['VITE_ADMIN_BLOG_PORT'];

const isTest =
  process.env.NODE_ENV === 'test' ||
  process.env.NODE_ENV === 'development' ||
  process.env.NODE_ENV === 'test_e2e' ||
  process.env.NODE_ENV !== 'production'; // TODO: this is not right imo

const app = express();

// This is per user. Each window is a specific IP address
if (!isTest) {
  app.use(
    slowDown({
      windowMs: 15 * 60 * 1000, // 15 mins
      delayAfter: 50, // start delaying after 50 requests
      delayMs: () => 2000, // delay of 2 seconds
    }),
  );

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 mins
      max: 200, // 200 requests total
    }),
  );
}

app.use(compression());

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
  }),
);

app.use(
  cors({
    // allow only requests from that origin (*PORT is also part of origin)
    origin: [
      `http://${apiHost}:${apiPort}`,
      `http://${publicBlogHost}:${publicBlogPort}`,
      `http://${adminBlogHost}:${adminBlogPort}`,
    ],
    credentials: true,
    exposedHeaders: ['set-cookie'],
  }),
);
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const { strategy } = authInjector.get(
  PassportJwtStrategy,
) as PassportJwtStrategy;
passport.use(JWT_STRATEGY_NAME, strategy);

app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.get('/api/v1', (req, res) =>
  res.status(200).send({ message: 'Welcome to v1 of the api!' }),
);

app.use(responseWrapper);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/posts', postsRouter);
app.use('/api/v1/tags', tagsRouter);
app.use('/api/v1/posts/:postId/comments', commentsRouter);
app.use('/api/v1/reports/comments', commentReportsRouter);

if (isTest) {
  app.use('/test', testDataRouter);
}

const swaggerDocOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Blog API',
      version: '1.0.0',
      description:
        'A simple RESTful API for a blogging platform that supports user authentication, content creation, and access control. It enables users to register, log in, manage their posts, and control visibility of content through role-based permissions.',
    },
    servers: [
      {
        url: `http://${apiHost}:${apiPort}/api/v1`,
      },
    ],
  },
  apis: ['apps/api/src/routes/*.ts'],
};

const specs = swaggerJsDoc(swaggerDocOptions);

app.use(
  '/api-docs',
  swaggerUI.serve,
  swaggerUI.setup(specs, {
    explorer: true, // adds a search bar
  }),
);

// All unmapped routes handled here
app.use((req, res, next) => {
  next(new ApiException(ERROR_CODES.SERVER.NOT_FOUND));
});

app.use(errorHandler);

const server = app.listen(apiPort, () => {
  console.log(`Listening at http://${apiHost}:${apiPort}/api`);
});
server.on('error', console.error);
