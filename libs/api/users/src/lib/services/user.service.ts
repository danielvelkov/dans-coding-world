import { User } from '@dans-coding-world/prisma-schema';
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

export const USER_REPOSITORY_TOKEN = 'IUserRepository';

@Injectable()
export class UserService implements IUserService {
  PRIVATE_FIELDS = [getKey<User>('password')];
  PROTECTED_FIELDS = [getKey<User>('email')];

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

    const filteredUser = filterObject(
      user,
      Object.keys(user).filter((key) => {
        if (this.PRIVATE_FIELDS.includes(key as keyof User)) return false;
        if (
          this.PROTECTED_FIELDS.includes(key as keyof User) &&
          !isAuthor &&
          !hasElevatedPrivileges
        )
          return false;
        return true;
      })
    );

    return { user: filteredUser };
  }

  changeRole(dto: ChangeRoleDto): Promise<User> {
    throw new Error('Method not implemented.');
  }
  changeBanStatus(dto: ChangeBanStatusDto): Promise<User> {
    throw new Error('Method not implemented.');
  }
  update(dto: UpdateUserDto): Promise<User> {
    throw new Error('Method not implemented.');
  }
  changePassword(dto: ChangePasswordDto): Promise<User> {
    throw new Error('Method not implemented.');
  }
  delete(dto: DeleteUserDto): Promise<User> {
    throw new Error('Method not implemented.');
  }
}
