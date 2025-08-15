import {
  Strategy as JwtStrategy,
  ExtractJwt,
  StrategyOptionsWithoutRequest,
  VerifyCallback,
} from 'passport-jwt';

import { mockClient as client } from '@dans-coding-world/user-data-access';

const opts: StrategyOptionsWithoutRequest = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.SECRET_KEY?.toString() ?? '',
};

const verify: VerifyCallback = async (jwt_payload, done) => {
  try {
    const user = await client.getById(jwt_payload.sub); //'sub' stands for subject
    if (!user) return done(null, false, { message: 'Invalid token' });

    done(null, user);
  } catch (error) {
    console.error(error);
    done(error);
  }
};

export const strategy = new JwtStrategy(opts, verify);
