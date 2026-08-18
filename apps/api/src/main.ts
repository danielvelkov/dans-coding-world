import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { ApiException } from '@dans-coding-world/api-exceptions';
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

const host = process.env['HOST'] ?? 'localhost';
const port = process.env['PORT'] ?? 3000;

const publicBlogURL = process.env['VITE_PUBLIC_BLOG_URL'];
const adminBlogURL = process.env['VITE_ADMIN_BLOG_URL'];
let apiURL = process.env['API_URL'];

if (!publicBlogURL || !adminBlogURL) {
  console.error(
    `Missing required environment variables:
     VITE_PUBLIC_BLOG_URL, VITE_ADMIN_BLOG_URL`,
  );
  process.exit(1);
}

const isProd = process.env.NODE_ENV === 'production';
const isTest = ['test', 'development', 'test_e2e'].includes(
  process.env.NODE_ENV ?? '',
);

if (isProd && !apiURL) {
  console.error(
    `Missing required environment variables:
     API_URL`,
  );
  process.exit(1);
} else if (!apiURL) apiURL = `http://${host}:${port}`;

const app = express();
if (isProd) app.set('trust proxy', 1); // in production the app will likely run behind a reverse proxy. For cookies and rate limiting to work we must set this to 1

// This is per user. Each window is a specific IP address
if (isProd) {
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

const apiHelmet = helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-origin' },
});
const swaggerHelmet = helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});
app.use((req, res, next) => {
  if (req.path === '/api-docs' || req.path.startsWith('/api-docs/')) {
    return swaggerHelmet(req, res, next);
  }
  return apiHelmet(req, res, next);
});

app.use(
  cors({
    // allow only requests from that origin (*PORT is also part of origin)
    origin: [apiURL, publicBlogURL, adminBlogURL],
    credentials: true,
    exposedHeaders: ['set-cookie'],
  }),
);
app.use(cookieParser());
app.use(express.urlencoded({ limit: '10mb', extended: false }));
app.use(express.json({ limit: '10mb' }));

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
        url: `${apiURL}/api/v1`,
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

const server = app.listen(port, () => {
  console.log(`Listening at ${apiURL}/api/v1`);
});
server.on('error', console.error);

const shutdownHandler = (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  server.close((err) => {
    if (err) {
      console.error('Error during server shutdown:', err);
      process.exit(1);
    }

    console.log('Server closed. No longer accepting connections.');
    process.exit(0);
  });

  // Force shutdown if it takes too long
  setTimeout(() => {
    console.error(
      'Could not close connections in time, forcefully shutting down',
    );
    process.exit(1);
  }, 10000); // 10 seconds timeout
};

process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
process.on('SIGINT', () => shutdownHandler('SIGINT'));
