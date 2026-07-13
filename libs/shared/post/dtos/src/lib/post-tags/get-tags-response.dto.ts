import  type { Tag } from '@dans-coding-world/prisma-schema';
import { Collection } from '@dans-coding-world/api-types';

export type GetTagsResponse = Collection<Tag>;
