import { GetPostsResponseDto } from '@dans-coding-world/shared-post-dto';
import {
  rand,
  randFirstName,
  randLastName,
  randNumber,
  randPastDate,
  randSentence,
  randUserName,
} from '@ngneat/falso';
import { PAGINATION } from '@dans-coding-world/shared-constants';
import { PostStatus, PostVisibility } from '@dans-coding-world/prisma-schema';

export function generateMockPostsResponse({
  length = 5,
  pageSize = PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
}: {
  length: number;
  pageSize: number;
}): GetPostsResponseDto {
  return {
    items: generateRandomPosts(length).slice(0, pageSize),
    pagination: {
      page: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
      limit: pageSize,
      total: 1,
    },
    count: length > pageSize ? pageSize : length,
  };
}

export function generateRandomPosts(
  count: number
): GetPostsResponseDto['items'] {
  const posts = [];
  while (count > 0) {
    const authorId = randNumber({ min: 1, max: 1000 });
    const author = {
      id: authorId,
      username: randUserName(),
      role: 'AUTHOR',
      isBanned: false,
      profile: {
        id: randNumber({ min: 1, max: 1000 }),
        avatarURL: 'URL',
        firstName: randFirstName(),
        lastName: randLastName(),
        bio: randSentence(),
        userId: authorId,
      },
    };
    const post = {
      id: randNumber({ min: 1, max: 1000 }),
      title: randSentence(),
      content: randSentence({ length: randNumber({ max: 3 }) }).join(' '),
      createdAt: randPastDate(),
      publishedAt: randPastDate(),
      updatedAt: randPastDate(),
      status: 'PUBLISHED' as PostStatus,
      visibility: rand(['MEMBERS_ONLY', 'PUBLIC']) as PostVisibility,
      authorId: author.id,
      author: author,
    };
    posts.push(post);
    count--;
  }
  return posts;
}
