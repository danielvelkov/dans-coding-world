import {
  rand,
  randNumber,
  randPastDate,
  randProgrammingLanguage,
  randSentence,
} from '@ngneat/falso';
import { PostStatus, PostVisibility } from '@dans-coding-world/prisma-schema';
import { GetPostsResponseDto } from '@dans-coding-world/shared-post-dto';
import { generateRandomUserPreview } from './user-generator.js';

export function generateRandomPosts(
  count: number
): GetPostsResponseDto['items'] {
  const posts = [];

  while (count > 0) {
    const author = generateRandomUserPreview();
    const post = {
      id: randNumber({ min: 1, max: 1000 }),
      title: randSentence({ maxCharCount: 15 }),
      content: randSentence({ length: randNumber({ max: 20 }) }).join(' '),
      createdAt: randPastDate(),
      publishedAt: randPastDate(),
      updatedAt: randPastDate(),
      status: 'PUBLISHED' as PostStatus,
      visibility: 'PUBLIC' as PostVisibility,
      authorId: author.id,
      author: author,
      tags: [
        ...new Set(
          randProgrammingLanguage({ length: randNumber({ min: 1, max: 5 }) })
        ),
      ],
    };
    posts.push(post);
    count--;
  }
  return posts;
}
