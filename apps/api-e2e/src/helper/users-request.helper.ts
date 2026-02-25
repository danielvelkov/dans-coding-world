import { readFileSync } from 'fs';
import path from 'path';
import {
  ChangeBanStatusDto,
  ChangePasswordDto,
  ChangeRoleDto,
  UpdateUserDto,
} from '@dans-coding-world/shared-user-dto';
import {
  ApiClient,
  API_ENDPOINTS,
  toFormData,
  toURLSearchParams,
} from '@dans-coding-world/shared-data-access-api';
import { multipartHeaders, urlEncodedHeaders } from './common.helper';

export function createUsersRouteHelper(client: ApiClient) {
  return {
    revokeUserTokens(userId: string) {
      return client.post(API_ENDPOINTS.USERS.REVOKE_TOKENS(+userId));
    },

    getUser(userId: string) {
      return client.get(API_ENDPOINTS.USERS.BY_ID(+userId));
    },

    updateUser(
      profileData: Omit<UpdateUserDto, 'userId' | 'avatar'>,
      avatarFilePath?: string
    ) {
      const formData = toFormData(profileData);
      if (avatarFilePath) {
        const fileBuffer = readFileSync(avatarFilePath);
        const ext = path.extname(avatarFilePath).substring(1);
        const blob = new Blob([fileBuffer], { type: `image/${ext}` });
        formData.append('avatar', blob, avatarFilePath);
      }
      return client.patch(API_ENDPOINTS.USERS.UPDATE, formData, {
        headers: multipartHeaders,
      });
    },

    changePassword(data: Omit<ChangePasswordDto, 'userId'>) {
      const body = toURLSearchParams(data);
      return client.patch(API_ENDPOINTS.USERS.PASSWORD, body, {
        headers: urlEncodedHeaders,
      });
    },

    changeUserRole(id: string, data: Omit<ChangeRoleDto, 'userId'>) {
      const body = toURLSearchParams(data);
      return client.patch(API_ENDPOINTS.USERS.ROLE_CHANGE(+id), body, {
        headers: urlEncodedHeaders,
      });
    },

    changeBanStatus(
      id: string,
      data: Omit<ChangeBanStatusDto, 'userId' | 'userToChangeId'>
    ) {
      const body = toURLSearchParams(data);
      return client.patch(API_ENDPOINTS.USERS.BAN(+id), body, {
        headers: urlEncodedHeaders,
      });
    },

    deleteUser(userId: string) {
      return client.delete(API_ENDPOINTS.USERS.BY_ID(+userId));
    },
  };
}
