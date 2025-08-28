import express from 'express';
import passport from 'passport';
import { strategy } from '@dans-coding-world/shared-util-auth';
import * as path from 'path';
import authRouter from './routes/auth.router.js';

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

passport.use(strategy);

app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.get('/api/v1', (req, res) =>
  res.status(200).send({ message: 'Welcome to v1 of the api!' })
);

app.use('/api/v1/auth', authRouter);

const port = process.env.PORT || 3333;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});
server.on('error', console.error);
