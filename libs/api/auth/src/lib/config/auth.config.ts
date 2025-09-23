import { JwtConfiguration } from './jwt.config.js';
import { ValidationConfiguration } from './validation.config.js';

const tryGet = (envVarName: string) => {
  if (!process.env[envVarName] || !process.env[envVarName].length)
    throw new Error(`Missing env variable '${envVarName}'`);
  return process.env[envVarName];
};

export type AuthConfiguration = Required<
  Readonly<JwtConfiguration & ValidationConfiguration>
>;

export const config: AuthConfiguration = {
  options: {
    accessSecret: tryGet('ACCESS_TOKEN_SECRET'),
    accessExpiration: 1000 * 60 * 15, // 15 min in ms
    refreshSecret: tryGet('REFRESH_TOKEN_SECRET'),
    refreshExpiration: 1000 * 60 * 60 * 24 * 30, // 1 month in ms
  },
  rules: {
    emailMinLength: 5,
    emailMaxLength: 32,
    passwordMinLength: 8,
    passwordMaxLength: 32,
  },
};
