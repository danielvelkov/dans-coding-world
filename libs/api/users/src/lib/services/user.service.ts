import {
  User,
  UserOrderByInput,
  UserWhereInput,
  client,
} from '@dans-coding-world/prisma-schema';
import { Inject, Injectable } from 'injection-js';
import type { IUserRepository } from '@dans-coding-world/shared-data-access-interfaces';
import { transformAndValidateDto } from '@dans-coding-world/validation';
import { ApiException } from '@dans-coding-world/exceptions';
import {
  ERROR_CODES,
  PAGINATION,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import {
  filterObject,
  getKey,
  validPassword,
  hashPassword,
} from '@dans-coding-world/helpers';
import { IUserService } from '../interfaces/user-service.interface.js';
import {
  GetUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  DeleteUserDto,
  ChangeBanStatusDto,
  ChangeRoleDto,
  GetUserResponseDto,
  AvatarImageDto,
  GetUsersDto,
  GetUsersResponseDto,
} from '@dans-coding-world/shared-user-dto';
import { UserDetail } from '@dans-coding-world/user-data-access';
import type { IStorageProvider } from '@dans-coding-world/api-file-storage';
import { STORAGE_PROVIDER_TOKEN } from '@dans-coding-world/api-file-storage';
import { unlink } from 'fs';

export const USER_REPOSITORY_TOKEN = 'IUserRepository';

@Injectable()
export class UserService implements IUserService {
  private readonly PRIVATE_FIELDS = [getKey<User>('password')];
  private readonly PROTECTED_FIELDS = [getKey<User>('email')];

  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    public users: IUserRepository,
    @Inject(STORAGE_PROVIDER_TOKEN)
    public storageProvider: IStorageProvider,
  ) {}

  async getById(dto: GetUserDto): Promise<GetUserResponseDto> {
    dto = await transformAndValidateDto(dto, GetUserDto);

    const viewer = dto.viewerId
      ? await this.users.getById(dto.viewerId.toString())
      : null;

    const user = await this.users.getById(dto.userId.toString());
    if (!user) {
      throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);
    }

    const isAuthor = dto.userId === dto.viewerId;
    const hasElevatedPrivileges =
      viewer && (viewer.role === 'ADMIN' || viewer.role === 'MOD');

    const filteredUser = this.filterUserData(
      user,
      true,
      !isAuthor && !hasElevatedPrivileges,
    );

    return { user: filteredUser };
  }

  async getAll(dto?: GetUsersDto): Promise<GetUsersResponseDto> {
    if (dto) dto = await transformAndValidateDto(dto, GetUsersDto);

    const where = await this.buildUsersWhereClause(
      dto?.filterBy,
      dto?.searchQuery,
    );

    const orderBy = { ...dto?.sortBy } as UserOrderByInput;

    const [users, total] = await Promise.all([
      this.users.search(where, orderBy, {
        skip: dto?.pageOffset ?? 0,
        take: dto?.pageSize ?? PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE,
      }),
      this.users.count(where),
    ]);

    const usersPerPage =
      dto?.pageSize ?? PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE;
    const currentPage = Math.floor((dto?.pageOffset ?? 0) / usersPerPage) + 1;
    const totalPages = Math.ceil(total / usersPerPage);

    const finalResults = users.map((u) => this.filterUserData(u, true, false));

    return {
      items: finalResults,
      count: users.length,
      pagination: {
        total,
        limit: usersPerPage,
        page: currentPage,
        totalPages,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1,
      },
    };
  }

  async update(dto: UpdateUserDto): Promise<GetUserResponseDto> {
    dto = await transformAndValidateDto(dto, UpdateUserDto);

    let user = (await this.users.getById(dto.userId.toString())) as UserDetail;
    if (!user) throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);

    const wantsToRemoveAvatar = dto.removeAvatar;
    const hasNewAvatar = !!dto.avatar?.path;

    const newAvatarURL =
      hasNewAvatar && !wantsToRemoveAvatar
        ? await this.uploadAvatar((dto.avatar as AvatarImageDto).path)
        : undefined;

    if (!user.profile) {
      const profile = await client.profile.create({
        data: {
          userId: dto.userId,
          firstName: dto.firstName ?? '',
          lastName: dto.lastName ?? '',
          bio: dto.bio ?? '',
          avatarURL: newAvatarURL ?? '',
        },
      });

      user.profile = profile;
    } else {
      const currentAvatarURL = user.profile.avatarURL;

      // Delete old avatar if replaced or removed
      if ((hasNewAvatar || wantsToRemoveAvatar) && currentAvatarURL) {
        await this.storageProvider.deleteFile(currentAvatarURL);
      }

      const profileUpdates: Record<string, string> = {};

      if (dto.firstName !== undefined) profileUpdates.firstName = dto.firstName;
      if (dto.lastName !== undefined) profileUpdates.lastName = dto.lastName;
      if (dto.bio !== undefined) profileUpdates.bio = dto.bio;

      if (hasNewAvatar || wantsToRemoveAvatar) {
        profileUpdates.avatarURL = newAvatarURL ?? '';
      }

      user = await this.users.update(dto.userId, {}, profileUpdates);
    }

    const filteredUser = this.filterUserData(user, true, false);
    return { user: filteredUser };
  }

  async changePassword(dto: ChangePasswordDto): Promise<User> {
    dto = await transformAndValidateDto(dto, ChangePasswordDto);

    const user = await this.users.getById(dto.userId.toString());
    if (!user) throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);

    const isPasswordValid = await validPassword(dto.oldPassword, user.password);

    if (!isPasswordValid)
      throw new ApiException(ERROR_CODES.AUTH.INVALID_CREDENTIALS);

    const isNewPasswordSameAsOldPassword = await validPassword(
      dto.newPassword,
      user.password,
    );

    if (isNewPasswordSameAsOldPassword)
      throw new ApiException(ERROR_CODES.AUTH.SAME_PASSWORD);

    const updatedUser = await this.users.update(dto.userId, {
      password: await hashPassword(dto.newPassword),
    });

    const filteredUser = this.filterUserData(updatedUser, true, false);
    return filteredUser;
  }

  async changeRole(dto: ChangeRoleDto): Promise<User> {
    dto = await transformAndValidateDto(dto, ChangeRoleDto);

    const user = await this.users.getById(dto.userId.toString());
    if (!user) throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);

    if (user.role === dto.role)
      throw new ApiException(
        ERROR_CODES.VALIDATION.VALIDATION_ERROR,
        VALIDATION_MESSAGES.users.sameRole,
      );

    if (user.role === 'ADMIN')
      throw new ApiException(ERROR_CODES.SECURITY.ADMIN_PRIVILEGE_VIOLATION);

    if (dto.role === 'ADMIN')
      throw new ApiException(ERROR_CODES.SECURITY.FORBIDDEN_PROMOTION);

    const updatedUser = await this.users.update(dto.userId, {
      role: dto.role,
    });

    const filteredUser = this.filterUserData(updatedUser, true, false);
    return filteredUser;
  }

  async changeBanStatus(dto: ChangeBanStatusDto): Promise<User> {
    dto = await transformAndValidateDto(dto, ChangeBanStatusDto);

    if (dto.userId === dto.userToChangeId)
      throw new ApiException(ERROR_CODES.SECURITY.SELF_ACTION_FORBIDDEN);

    const [user, userToChange] = await Promise.all([
      this.users.getById(dto.userId.toString()),
      this.users.getById(dto.userToChangeId.toString()),
    ]);

    if (!user || !userToChange)
      throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);

    if (userToChange.role === 'ADMIN')
      throw new ApiException(ERROR_CODES.SECURITY.ADMIN_PRIVILEGE_VIOLATION);

    if (user.role === 'MOD' && userToChange.role === 'MOD')
      throw new ApiException(ERROR_CODES.SECURITY.MODERATION_CONFLICT);

    const updatedUser = await this.users.update(dto.userToChangeId, {
      isBanned: dto.isBanned,
    });

    const filteredUser = this.filterUserData(updatedUser, true, false);
    return filteredUser;
  }

  async delete(dto: DeleteUserDto): Promise<User> {
    dto = await transformAndValidateDto(dto, DeleteUserDto);

    const [user, userToDelete] = await Promise.all([
      this.users.getById(dto.userId.toString()),
      this.users.getById(dto.userToDeleteId.toString()),
    ]);

    if (!user || !userToDelete)
      throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);

    if (userToDelete.role === 'ADMIN')
      throw new ApiException(ERROR_CODES.SECURITY.ADMIN_PRIVILEGE_VIOLATION);

    if (user.role !== 'ADMIN' && user.id !== userToDelete.id)
      throw new ApiException(ERROR_CODES.SERVER.FORBIDDEN);

    const deletedUser = await this.users.delete(dto.userToDeleteId);

    const filteredUser = this.filterUserData(deletedUser, true, false);
    return filteredUser;
  }

  private filterUserData(
    user: User | UserDetail,
    hidePrivateFields = false,
    hideProtectedFields = false,
  ) {
    return filterObject(
      user,
      Object.keys(user).filter((key) => {
        const k = key as keyof User;
        if (hidePrivateFields && this.PRIVATE_FIELDS.includes(k)) return false;
        if (hideProtectedFields && this.PROTECTED_FIELDS.includes(k))
          return false;
        return true;
      }),
    );
  }

  private async uploadAvatar(filePath: string) {
    try {
      return await this.storageProvider.uploadFile(filePath);
    } finally {
      unlink(filePath, (err) => {
        if (err) throw err;
        console.debug(`File: (${filePath}) was deleted`);
      });
    }
  }

  private async buildUsersWhereClause(
    filters?: GetUsersDto['filterBy'],
    searchQuery?: string,
  ): Promise<UserWhereInput> {
    const clauses: UserWhereInput[] = [];
    // STEP 1: Check if no filters should be applied
    if (!filters && !searchQuery) {
      return {};
    }

    // STEP 2: Explicit Filters - What DOES the user want to see?
    if (filters) {
      // STEP 2.1: Filtering by role
      if (filters.role) {
        clauses.push({
          role: filters.role,
        });
      }

      // STEP 2.2: Filtering by whether or not user is banned
      if (filters.isBanned !== undefined)
        clauses.push({
          isBanned: filters.isBanned,
        });
    }

    // STEP 3: Search Query
    if (searchQuery) {
      clauses.push({
        username: { contains: searchQuery.trim(), mode: 'insensitive' },
      });
    }

    return { AND: clauses };
  }
}
