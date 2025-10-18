import { PrismaClient } from '../generated/prisma/client.js';
import { Prisma } from '../generated/prisma/client.js';
import { createPrismock } from 'prismock';

const MockClient = createPrismock(Prisma);

const isTest = process.env.NODE_ENV === 'test';

const client: PrismaClient = isTest ? new MockClient() : new PrismaClient();

export { client };
