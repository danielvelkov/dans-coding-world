import users from '../data/users.json' with {type: "json"};
import { client, Role } from '@dans-coding-world/prisma-schema';

const load = async () => {
  try {
    await client.user.deleteMany();
    console.log('Deleted records in user table');

    await client.$queryRaw`ALTER SEQUENCE public."User_id_seq" RESTART WITH 1;`;
    console.log('Reset user table auto increment to 1');

    await client.user.createMany({
      data: users.map(u => ({...u, role: u.role as Role})),
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
