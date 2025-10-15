import { IUserRepository } from '@dans-coding-world/shared-data-access-interfaces';
import { UserWhereInput, User } from '@dans-coding-world/prisma-schema';

export class MockUserDataAccess implements IUserRepository {
  static nextId = 0;
  users: User[] = [];
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
      ...(data as User),
      id: MockUserDataAccess.nextId++,
    };
    this.users.push(user);
    return user;
  }
}
