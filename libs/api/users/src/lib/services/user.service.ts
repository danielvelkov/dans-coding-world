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
          avatarURL: dto.avatarUrl ?? '',
        },
      });
      user.profile = profile;
    } else user = await this.users.update(dto.userId, {}, dto);

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

  changeRole(dto: ChangeRoleDto): Promise<User> {
    throw new Error('Method not implemented.');
  }
  changeBanStatus(dto: ChangeBanStatusDto): Promise<User> {
    throw new Error('Method not implemented.');
  }
  delete(dto: DeleteUserDto): Promise<User> {
    throw new Error('Method not implemented.');
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
