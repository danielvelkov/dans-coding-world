import users from '../data/users.json' with {type: "json"};
import { client } from '@dans-coding-world/prisma-schema';

const load = async () => {
  try {
    await client.user.deleteMany();
    console.log('Deleted records in user table');

    await client.$queryRaw`ALTER TABLE "User" AUTO_INCREMENT = 1`;
    console.log('Reset user table auto increment to 1');

    await client.user.createMany({
      data: users,
    });
    console.log('Added user data');
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await client.$disconnect();
  }
};

load();
