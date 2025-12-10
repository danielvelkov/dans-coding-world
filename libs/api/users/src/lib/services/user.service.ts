import { User, client } from '@dans-coding-world/prisma-schema';
import { Inject, Injectable } from 'injection-js';
import type { IUserRepository } from '@dans-coding-world/shared-data-access-interfaces';
import { transformAndValidateDto } from '@dans-coding-world/validation';
import { ApiException } from '@dans-coding-world/exceptions';
import {
  ERROR_CODES,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { filterObject, getKey } from '@dans-coding-world/helpers';
import { IUserService } from '../interfaces/user-service.interface.js';
import {
  GetUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  DeleteUserDto,
  ChangeBanStatusDto,
  ChangeRoleDto,
  GetUserResponseDto,
} from '@dans-coding-world/shared-user-dto';
import { UserDetail } from '@dans-coding-world/user-data-access';

export const USER_REPOSITORY_TOKEN = 'IUserRepository';

@Injectable()
export class UserService implements IUserService {
  private readonly PRIVATE_FIELDS = [getKey<User>('password')];
  private readonly PROTECTED_FIELDS = [getKey<User>('email')];

  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    public users: IUserRepository
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
      !isAuthor && !hasElevatedPrivileges
    );

    return { user: filteredUser };
  }

  async update(dto: UpdateUserDto): Promise<GetUserResponseDto> {
    dto = await transformAndValidateDto(dto, UpdateUserDto);

    let user = (await this.users.getById(dto.userId.toString())) as UserDetail;
    if (!user) throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);

    if (!user.profile) {
      const profile = await client.profile.create({
        data: {
          userId: dto.userId,
          firstName: dto.firstName ?? '',
          lastName: dto.lastName ?? '',
          bio: dto.bio ?? '',
          avatarURL: dto.avatarURL ?? '',
        },
      });
      user.profile = profile;
    } else
      user = await this.users.update(
        dto.userId,
        {},
        {
          ...(dto.firstName ? { firstName: dto.firstName } : undefined),
          ...(dto.lastName ? { lastName: dto.lastName } : undefined),
          ...(dto.bio ? { bio: dto.bio } : undefined),
          ...(dto.avatarURL ? { avatarURL: dto.avatarURL } : undefined),
        }
      );

    const filteredUser = this.filterUserData(user, true, false);

    return { user: filteredUser };
  }

  async changePassword(dto: ChangePasswordDto): Promise<User> {
    dto = await transformAndValidateDto(dto, ChangePasswordDto);

    const user = await this.users.getById(dto.userId.toString());
    if (!user) throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);

    if (user.password !== dto.oldPassword)
      throw new ApiException(ERROR_CODES.AUTH.INVALID_CREDENTIALS);

    if (user.password === dto.newPassword)
      throw new ApiException(ERROR_CODES.AUTH.SAME_PASSWORD);

    const updatedUser = await this.users.update(dto.userId, {
      password: dto.newPassword,
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
        VALIDATION_MESSAGES.users.sameRole
      );

    if (user.role === 'ADMIN')
      throw new ApiException(ERROR_CODES.SECURITY.ADMIN_PRIVILEGE_VIOLATION);

    if (dto.role === 'ADMIN')
      throw new ApiException(ERROR_CODES.SECURITY.SELF_ACTION_FORBIDDEN);

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
      throw new ApiException(ERROR_CODES.SECURITY.ADMIN_PRIVILEGE_VIOLATION);

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
    hideProtectedFields = false
  ) {
    return filterObject(
      user,
      Object.keys(user).filter((key) => {
        const k = key as keyof User;
        if (hidePrivateFields && this.PRIVATE_FIELDS.includes(k)) return false;
        if (hideProtectedFields && this.PROTECTED_FIELDS.includes(k))
          return false;
        return true;
      })
    );
  }
}
