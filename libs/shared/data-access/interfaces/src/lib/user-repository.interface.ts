import type {
  Profile,
  User,
  UserOrderByInput,
  UserWhereInput,
} from '@dans-coding-world/prisma-schema';

/**
 * Interface for managing user related data
 */
export interface IUserRepository {
  getById(id: string): Promise<User | null>;
  search(
    where?: UserWhereInput,
    orderBy?: UserOrderByInput,
    options?: {
      skip?: number;
      take?: number;
    },
  ): Promise<User[]>;
  get(where: UserWhereInput): Promise<User | null>;
  exists(username: string, email: string): Promise<boolean>;
  create(data: Omit<User, 'id'>): Promise<User>;
  update(
    id: number,
    data: Partial<User>,
    profileData?: Partial<Profile>,
  ): Promise<User>;
  delete(id: number): Promise<User>;
  deleteMany(where: UserWhereInput): Promise<number>;
  count(where?: UserWhereInput): Promise<number>;
}
