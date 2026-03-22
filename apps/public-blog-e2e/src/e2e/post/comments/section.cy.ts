import { PostFull } from '@dans-coding-world/post-data-access';
import { Comment, Post, Profile, User } from '@dans-coding-world/prisma-schema';
import { COMMENT_CONSTRAINTS } from '@dans-coding-world/shared-constants';

describe('Comments - section', () => {
  let testPosts: Post[];
  let testComments: Comment[];
  const testUsers: PostFull['author'][] = [];

  before(() => {
    cy.task('db:seed-users', {
      options: { useDefaults: true, clearExisting: true },
    }).then((seededUsers) => {
      const users = seededUsers as User[];
      if (!users || !users.length) throw new Error('Missing user fixtures');

      cy.task('db:seed-profiles', {
        options: { useDefaults: true, clearExisting: true },
      }).then((seededProfiles) => {
        const profiles = seededProfiles as Profile[];
        if (!profiles || !profiles.length)
          throw new Error('Missing user profile fixtures');

        for (let i = 0; i < users.length; i++)
          testUsers.push({
            ...users[i],
            profile: profiles[i],
          });
      });
    });

    cy.task('db:seed-posts', {
      options: { useDefaults: true, clearExisting: true },
    }).then((posts) => {
      testPosts = (posts as Post[]).filter(
        (p) => p.status === 'PUBLISHED' && p.visibility === 'PUBLIC'
      );
      if (!testPosts || !testPosts.length)
        throw new Error('Missing post fixtures');
    });

    cy.task('db:seed-comments', {
      options: { useDefaults: true, clearExisting: true },
    }).then((comments) => {
      testComments = comments as Comment[];
      if (!testPosts || !testPosts.length)
        throw new Error('Missing comment fixtures');
    });
  });

  let post: Post;
  let postComments: Comment[];

  beforeEach(() => {
    post = getRandomPostWithComments();
    postComments = getRootCommentsForPost(post.id);

    cy.visit(`/blog/${post.id}`);
  });

  it(`shows post's comments total, excluding nested replies`, () => {
    cy.contains(`Comments (${postComments.length})`);
  });

  it('shows post comments in an list', () => {
    cy.get(`ul[aria-label="Post comments"]`).within(() => {
      cy.get('li').its('length').should('eq', postComments.length);
    });
  });

  it('if a comment has replies, a "view replies" button is present', () => {
    const randomCommentWithReplies = getRandomRootCommentWithReplies();

    cy.visit(`/blog/${randomCommentWithReplies.postId}`);

    cy.get(`ul[aria-label="Post comments"]`).within(() => {
      cy.contains('p', randomCommentWithReplies.content)
        .closest('li')
        .get('button')
        .its(0)
        .should('contain.text', 'View Replies');
    });
  });

  it('shows total reply count in "view replies (n)" button', () => {
    const randomCommentWithReplies = getRandomRootCommentWithReplies();
    const replyCount = getReplyCountRecursively(randomCommentWithReplies.id);

    cy.visit(`/blog/${randomCommentWithReplies.postId}`);
    cy.get(`ul[aria-label="Post comments"]`).within(() => {
      cy.contains('p', randomCommentWithReplies.content)
        .closest('li')
        .within(() => {
          cy.get('button').should(
            'contain.text',
            `View Replies (${replyCount})`
          );
        });
    });
  });

  it(`renders comment's replies when selecting "view replies"`, () => {
    const randomCommentWithReplies = getRandomRootCommentWithReplies();
    const commentAuthor = testUsers.find(
      (u) => u.id === randomCommentWithReplies.userId
    );
    cy.visit(`/blog/${randomCommentWithReplies.postId}`);
    cy.get(`ul[aria-label="Post comments"]`).within(() => {
      const commentReplies = testComments.filter(
        (c) => c.threadParentId === randomCommentWithReplies.id
      );
      cy.contains('p', randomCommentWithReplies.content)
        .closest('li')
        .within(() => {
          cy.contains('ul').should('not.exist');
          cy.contains('button', /Hide Replies/).should('not.exist');

          cy.contains('button', /View Replies/).click();
          cy.contains('button', /Hide Replies/).should('exist');
          cy.get(`ul[aria-label="Replies to ${commentAuthor?.username}"]`)
            .should('exist')
            .within(() => {
              for (const reply of commentReplies)
                cy.contains('p', reply.content);
            });
        });
    });
  });

  it('should not show replies at max reply depth or deeper', () => {
    const deeplyNestedComment = testComments.find(
      (c) => c.depth >= COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH
    );

    if (!deeplyNestedComment) throw new Error('Missing test comment');

    const rootComment = getRootCommentFromReply(deeplyNestedComment);
    cy.visit(`/blog/${rootComment.postId}`);
    cy.get(`ul[aria-label="Post comments"]`).within(() => {
      cy.contains('p', rootComment.content)
        .closest('li')
        .within(() => {
          let count = 1;
          while (count++ < COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH)
            cy.contains('button', /View Replies/i).click({ multiple: true });
        });
    });
    cy.contains(deeplyNestedComment.content).should('not.exist');
  });

  function getRootCommentFromReply(reply: Comment) {
    const parentComment = testComments.find(
      (c) => c.id === reply.threadParentId
    );
    if (!parentComment) return reply;
    else return getRootCommentFromReply(parentComment);
  }

  function getRandomPostWithComments() {
    return Cypress._.sample(
      testPosts.filter((p) => testComments.some((c) => c.postId === p.id))
    ) as Post;
  }

  function getRootCommentsForPost(postId: number) {
    return testComments.filter(
      (c) => !c.threadParentId && c.postId === postId
    ) as Comment[];
  }

  function getRandomRootCommentWithReplies() {
    const parentIds = new Set(
      testComments
        .filter((c) => c.threadParentId === null)
        .map((c) => c.threadParentId)
    );

    const commentsWithReplies = testComments.filter(
      (c) => c.threadParentId === null || parentIds.has(c.id)
    );

    return Cypress._.sample(
      commentsWithReplies.filter((c) =>
        testPosts
          .filter((p) => p.status === 'PUBLISHED')
          .map((p) => p.id)
          .includes(c.postId)
      )
    ) as Comment;
  }

  function getReplyCountRecursively(commentId: number): number {
    const replies = testComments.filter((c) => c.threadParentId === commentId);

    // Do not include deeply nested comments
    if (
      replies.some((c) => c.depth >= COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH)
    )
      return 0;

    let sum = replies.length;
    for (const reply of replies) sum += getReplyCountRecursively(reply.id);
    return sum;
  }
});
