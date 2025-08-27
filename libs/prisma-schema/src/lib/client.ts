import { PrismaClient } from '../generated/prisma/client.js';
export const client = new PrismaClient();

console.log(
  'PRISMA CLIENT IN : ',
  process.env.NODE_ENV === 'test' ? '### TEST ENV ###' : '### DEV ENV ###'
);
