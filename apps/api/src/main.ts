import express from 'express';
import passport from 'passport';
import { strategy } from '@dans-coding-world/shared-util-auth';
import {
  ApiException,
  globalErrorHandler,
} from '@dans-coding-world/exceptions';
import * as path from 'path';
import authRouter from './routes/auth.router.js';
import { ERROR_CODES } from '@dans-coding-world/shared-constants';
import swaggerUI from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

passport.use(strategy);

app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.get('/api/v1', (req, res) =>
  res.status(200).send({ message: 'Welcome to v1 of the api!' })
);

app.use('/api/v1/auth', authRouter);

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

app.use(globalErrorHandler);

const port = process.env.PORT || 3333;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});
server.on('error', console.error);
