import { GetPostsResponseDto } from '@dans-coding-world/shared-post-dto';
import { mockPostItemData } from './post-item-data.mock';

export const mockPostsResponse: GetPostsResponseDto = {
  items: [
    {
      ...mockPostItemData[0],
      createdAt: new Date(),
      status: 'PUBLISHED',
      updatedAt: new Date(),
      authorId: 1,
      visibility: 'PUBLIC',
    },
  ],
  pagination: {
    page: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
    limit: 5,
    total: 1,
  },
  count: 1,
};
