import { User, UserWhereInput } from '@dans-coding-world/prisma-schema';

export interface IUserService {
  getById(id: string): Promise<User | null>;
  get(where: UserWhereInput): Promise<User | null>;
  exists(username: string, email: string): Promise<boolean>;
  create(data: Omit<User, 'id'>): Promise<User>;
}
