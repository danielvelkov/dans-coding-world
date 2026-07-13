import { Collection, Paginated } from '@dans-coding-world/api-types';
import { UserDetail } from '@dans-coding-world/user-data-access';

export type GetUsersResponseDto = Collection<UserDetail> & Paginated;
