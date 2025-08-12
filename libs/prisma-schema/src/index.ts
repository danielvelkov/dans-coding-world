import { PrismaClient } from '../generated/prisma/client.js';
export type { User } from '../generated/prisma/client.js';

export const prisma = new PrismaClient();
