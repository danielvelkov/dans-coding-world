import { client } from '@dans-coding-world/user-data-access';
import {
  Strategy as JwtStrategy,
  ExtractJwt,
  StrategyOptionsWithoutRequest,
  VerifyCallback,
} from 'passport-jwt';

const opts: StrategyOptionsWithoutRequest = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.ACCESS_TOKEN_SECRET?.toString() ?? '',
};

const verify: VerifyCallback = async (jwt_payload, done) => {
  try {
    const user = await client.getById(jwt_payload.sub); //'sub' stands for subject
    done(null, user || false); // `false` = no error, but no user
  } catch (error) {
    console.error(error);
    done(error);
  }
};

export const strategy = new JwtStrategy(opts, verify);
