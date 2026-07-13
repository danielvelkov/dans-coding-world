import { randNumber, randPastDate, randSentence } from '@ngneat/falso';
import type { CommentWithReplies } from '@dans-coding-world/prisma-schema';
import { generateRandomUserPreview } from '@dans-coding-world/shared-user-testing';

export function generateRandomComments(
  postId: number,
  count: number,
): CommentWithReplies[] {
  const comments: CommentWithReplies[] = [];

  while (count > 0) {
    const authorId = randNumber({ min: 1, max: 1000 });
    const user = generateRandomUserPreview();

    user.id = authorId;

    const comment = {
      id: randNumber({ min: 1, max: 1000 }),
      content: randSentence({ length: randNumber({ min: 1, max: 2 }) }).join(
        ' ',
      ),
      createdAt: randPastDate(),
      updatedAt: randPastDate(),
      postId,
      depth: 0,
      replyCount: 0,
      replies: [],
      threadParentId: null,
      userId: authorId,
      user,
    };
    comments.push(comment);
    count--;
  }
  return comments;
}

export function generateCommentThreads(
  postId: number,
  count: number,
  replyLevels: number,
  threadParentId?: number,
  currentDepth = 0,
): CommentWithReplies[] {
  const comments = generateRandomComments(postId, count);

  return comments.map((c) => {
    const parentId = threadParentId ?? null;
    const depth = currentDepth;
    let replies: CommentWithReplies[] = [];

    if (replyLevels > 0) {
      replies = generateCommentThreads(
        postId,
        randNumber({ min: 1, max: count }),
        replyLevels - 1,
        c.id,
        currentDepth + 1,
      );
    }
    return {
      ...c,
      threadParentId: parentId,
      depth,
      replies,
      replyCount: replies.length,
    };
  });
}
