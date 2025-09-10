import {
  User,
  UserWhereInput,
  RefreshToken,
} from '@dans-coding-world/prisma-schema';

export interface IRefreshTokenService {
  getById(id: string): Promise<User | null>;
  get(where: UserWhereInput): Promise<User | null>;
  exists(username: string, email: string): Promise<boolean>;
  create(data: Omit<User, 'id'>): Promise<User>;
}
