import express from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { strategy } from '@dans-coding-world/util-auth';
import { client } from '@dans-coding-world/user-data-access';
import * as path from 'path';

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

passport.use(strategy);

app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.get('/api', (req, res) => {
  res.send({ message: 'Welcome to api!' });
});

const port = process.env.PORT || 3333;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});
server.on('error', console.error);
