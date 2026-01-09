import {
  rand,
  randFirstName,
  randLastName,
  randNumber,
  randPastDate,
  randProgrammingLanguage,
  randSentence,
  randUserName,
} from '@ngneat/falso';
import { PostStatus, PostVisibility } from '@dans-coding-world/prisma-schema';
import { GetPostsResponseDto } from '@dans-coding-world/shared-post-dto';

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
      title: randSentence({ maxCharCount: 15 }),
      content: randSentence({ length: randNumber({ max: 20 }) }).join(' '),
      createdAt: randPastDate(),
      publishedAt: randPastDate(),
      updatedAt: randPastDate(),
      status: 'PUBLISHED' as PostStatus,
      visibility: rand(['MEMBERS_ONLY', 'PUBLIC']) as PostVisibility,
      authorId: author.id,
      author: author,
      tags: randProgrammingLanguage({ length: randNumber({ min: 1, max: 5 }) }),
    };
    posts.push(post);
    count--;
  }
  return posts;
}
