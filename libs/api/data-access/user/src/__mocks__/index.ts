import { IUserRepository } from '@dans-coding-world/shared-data-access-interfaces';
import { UserWhereInput, User } from '@dans-coding-world/prisma-schema';
import bcrypt from 'bcryptjs';
class MockUserDataAccess implements IUserRepository {
  users: User[] = [
    {
      id: 1,
      username: 'moderator123',
      email: 'moderator123@gmail.com',
      password: bcrypt.hashSync('moderator123', 10),
      role: 'MOD',
    },
  ];
  async getById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === +id) ?? null;
  }

  async get(where: UserWhereInput): Promise<User | null> {
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

  async create(data: Omit<User, 'id'>): Promise<User> {
    const user = {
      ...data,
      id: Math.random() * 1000000,
    };
    this.users.push(user);
    return user;
  }
}

export const userRepo = new MockUserDataAccess();
