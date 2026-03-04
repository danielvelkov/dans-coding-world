import { randNumber, randPastDate, randSentence } from '@ngneat/falso';
import { CommentWithReplies } from '@dans-coding-world/prisma-schema';
import { COMMENT_CONSTRAINTS } from '@dans-coding-world/shared-constants';
import { generateRandomUserPreview } from './user-generator.js';

export function generateRandomComments(
  postId: number,
  count: number
): CommentWithReplies[] {
  const comments: CommentWithReplies[] = [];

  while (count > 0) {
    const authorId = randNumber({ min: 1, max: 1000 });
    const user = generateRandomUserPreview();

    user.id = authorId;

    const comment = {
      id: randNumber({ min: 1, max: 1000 }),
      content: randSentence({ length: randNumber({ min: 1, max: 2 }) }).join(
        ' '
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
  depth: number,
  threadParentId?: number
) {
  let comments = generateRandomComments(postId, count);
  if (depth > 0) {
    comments = comments.map((c) => {
      const replies = generateCommentThreads(
        postId,
        randNumber({ min: 1, max: count }),
        depth - 1,
        threadParentId ?? c.id
      );

      return {
        ...c,
        threadParentId: threadParentId ?? c.id,
        depth: COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH - depth,
        replies,
        replyCount: replies.length,
      };
    });
  }
  return comments;
}
