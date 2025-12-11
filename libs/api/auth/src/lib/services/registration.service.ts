import {
  RegisterDto,
  RegistrationResponseDto,
} from '@dans-coding-world/shared-auth-dto';
import { USER_REPOSITORY_TOKEN } from './auth.service.js';
import { IRegistrationService } from '../interfaces/registration-service.interface.js';
import { Injectable, Inject } from 'injection-js';
import type { IUserRepository } from '@dans-coding-world/shared-data-access-interfaces';
import { transformAndValidateDto } from '@dans-coding-world/validation';
import { ApiException } from '@dans-coding-world/exceptions';
import { ERROR_CODES } from '@dans-coding-world/shared-constants';
import { hashPassword } from '../helper/password.helper.js';

@Injectable()
export class RegistrationService implements IRegistrationService {
  constructor(@Inject(USER_REPOSITORY_TOKEN) public users: IUserRepository) {}
  async register(dto: RegisterDto): Promise<RegistrationResponseDto> {
    await transformAndValidateDto(dto, RegisterDto);

    const userExists = await this.users.exists(dto.username, dto.email);
    if (userExists) throw new ApiException(ERROR_CODES.VALIDATION.USER_EXISTS);

    const user = await this.users.create({
      ...dto,
      password: await hashPassword(dto.password),
      role: 'USER',
      isBanned: false,
    });

    const { password: _, ...userWithoutPass } = user;
    return { user: userWithoutPass };
  }
}
