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

const app = express();

app.use(compression());

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
  })
);

app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
    exposedHeaders: ['set-cookie'],
  })
);
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const { strategy } = authInjector.get(
  PassportJwtStrategy
) as PassportJwtStrategy;
passport.use(JWT_STRATEGY_NAME, strategy);

app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.get('/api/v1', (req, res) =>
  res.status(200).send({ message: 'Welcome to v1 of the api!' })
);

app.use(responseWrapper);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/posts', postsRouter);
app.use('/api/v1/posts/:postId/comments', commentsRouter);

const swaggerDocOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Blog API',
      version: '1.0.0',
      description: 'A simple API for dans-coding-world project',
    },
    servers: [
      {
        url: `http://localhost:3000/api/v1`,
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
  })
);

// All unmapped routes handled here
app.use((req, res, next) => {
  next(new ApiException(ERROR_CODES.SERVER.NOT_FOUND));
});

app.use(errorHandler);

const port = process.env.PORT || 3333;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});
server.on('error', console.error);
