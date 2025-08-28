import users from '../data/users.json' with {type: "json"};
import { client, Role } from '@dans-coding-world/prisma-schema';
import { hashPassword } from '@dans-coding-world/shared-util-auth'

 export const  seedUsers = async () => {
  try {
    await client.user.deleteMany();
    console.log('Deleted records in user table');

    await client.$queryRaw`ALTER SEQUENCE public."User_id_seq" RESTART WITH 1;`;

    await client.user.createMany({
      data: await Promise.all(users.map(async (u) => ({...u, role: u.role as Role, password: await hashPassword(u.password)})))
    });
    console.log('Added user data');
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await client.$disconnect();
  }
};

