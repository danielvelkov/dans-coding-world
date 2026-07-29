import {
  randNumber,
  randPastDate,
  randProgrammingLanguage,
  randSentence,
  randWord,
} from '@ngneat/falso';
import type {
  PostStatus,
  PostVisibility,
} from '@dans-coding-world/prisma-schema';
import { GetPostsResponseDto } from '@dans-coding-world/shared-post-dto';
import { generateRandomUserPreview } from '@dans-coding-world/shared-user-testing';
import { POST_CONSTRAINTS } from '@dans-coding-world/shared-constants';

export function generateRandomPosts(
  count: number,
): GetPostsResponseDto['items'] {
  const posts = [];

  while (count > 0) {
    const author = generateRandomUserPreview();
    const post = {
      id: randNumber({ min: 1, max: 100000 }),
      title: generateTitle(POST_CONSTRAINTS.MAX_TITLE_LENGTH - 1),
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
          randProgrammingLanguage({ length: randNumber({ min: 1, max: 5 }) }),
        ),
      ],
    };
    posts.push(post);
    count--;
  }
  return posts;
}

export function generateTitle(maxLength: number): string {
  let title = '';

  while (true) {
    const word = randWord({ capitalize: true });

    const next = title ? `${title} ${word}` : word;

    if (next.length > maxLength) break;

    title = next;
  }

  return title;
}
