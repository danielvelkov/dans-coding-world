import { JwtConfiguration } from './jwt.config.js';
import { TOKEN_CONSTRAINTS } from '@dans-coding-world/shared-constants';

const tryGetEnvVariable = (envVarName: string) => {
  if (!process.env[envVarName] || !process.env[envVarName].length)
    throw new Error(`Missing env variable '${envVarName}'`);
  return process.env[envVarName];
};

export type AuthConfiguration = Required<Readonly<JwtConfiguration>>;

export const config: AuthConfiguration = {
  options: {
    accessSecret: tryGetEnvVariable('ACCESS_TOKEN_SECRET'),
    accessExpiration: TOKEN_CONSTRAINTS.ACCESS_TOKEN_EXPIRATION,
    refreshSecret: tryGetEnvVariable('REFRESH_TOKEN_SECRET'),
    refreshExpiration: TOKEN_CONSTRAINTS.REFRESH_TOKEN_EXPIRATION,
  },
};
