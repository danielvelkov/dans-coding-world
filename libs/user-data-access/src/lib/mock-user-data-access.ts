import { IUserService } from '@dans-coding-world/util-interfaces';
import { UserWhereInput } from '@dans-coding-world/prisma-schema';
class MockUserDataAccess implements IUserService {
  users: {
    id: number;
    username: string;
    email: string;
    password: string;
  }[] = [
    {
      id: 1,
      username: 'moderator123',
      email: 'moderator123@gmail.com',
      password: 'moderator123',
    },
  ];
  async getById(id: string): Promise<{
    id: number;
    username: string;
    email: string;
    password: string;
  } | null> {
    return this.users.find((u) => u.id === +id) ?? null;
  }

  async get(where: UserWhereInput): Promise<{
    id: number;
    username: string;
    email: string;
    password: string;
  } | null> {
    return (
      this.users.find(
        (u) => u.username === where.username || u.email === where.email
      ) ?? null
    );
  }

  async exists(username: string, email: string): Promise<boolean> {
    const user = this.users.find(
      (u) => u.username === username || u.email === email
    );

    return !!user;
  }

  async create(
    data: Omit<
      { id: number; username: string; email: string; password: string },
      'id'
    >
  ): Promise<{
    id: number;
    username: string;
    email: string;
    password: string;
  }> {
    const user = {
      ...data,
      id: Math.random() * 1000000,
    };
    this.users.push(user);
    return user;
  }
}
export const mockClient = new MockUserDataAccess();
