import { JwtConfiguration } from './jwt.config.js';
import { TOKEN_CONSTRAINTS } from '@dans-coding-world/shared-constants';

const accessTokenSecret = process.env['ACCESS_TOKEN_SECRET'];
const refreshTokenSecret = process.env['REFRESH_TOKEN_SECRET'];
if (!accessTokenSecret || !refreshTokenSecret)
  throw new Error(
    'Missing env variables: ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET',
  );

export type AuthConfiguration = Required<Readonly<JwtConfiguration>>;

export const config: AuthConfiguration = {
  options: {
    accessSecret: accessTokenSecret,
    accessExpiration: TOKEN_CONSTRAINTS.ACCESS_TOKEN_EXPIRATION,
    refreshSecret: refreshTokenSecret,
    refreshExpiration: TOKEN_CONSTRAINTS.REFRESH_TOKEN_EXPIRATION,
  },
};
