import { PostFull } from '@dans-coding-world/post-data-access';
import { Comment, Post, Profile, User } from '@dans-coding-world/prisma-schema';
import { formatToRelativeTimeFromNow } from '@dans-coding-world/helpers';

describe('Comments - details', () => {
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
  let comment: Comment;
  let author: PostFull['author'];
  let authorDisplayName: string;

  beforeEach(() => {
    post = getRandomPostWithComments();
    comment = getRandomRootCommentForPost(post.id);
    author = getAuthorForComment(comment);
    authorDisplayName = getAuthorDisplayName(author);

    cy.visit(`/blog/${post.id}`);
  });

  it('shows comment author first and last name (if profile setup)', () => {
    cy.contains(authorDisplayName);
  });

  it(`displays comment content`, () => {
    // any of the <p> elements should have the random comment content
    cy.get('p').should('contain.text', comment.content);
  });

  it(`displays user's avatar`, () => {
    cy.contains('p', comment.content)
      .closest('div')
      .get(`img[src="${author.profile?.avatarURL}"]`);
  });

  it(`displays comment date relative to current time`, () => {
    cy.contains('p', comment.content)
      .closest('div')
      .find('time')
      .should(
        'have.text',
        formatToRelativeTimeFromNow(new Date(comment.createdAt))
      );
  });

  it(`selecting comment author name or avatar navigates to that user's page`, () => {
    cy.contains(authorDisplayName).click();
    cy.url().should('include', `/users/${author.id}`);

    cy.visit(`/blog/${post.id}`);

    cy.contains('p', comment.content)
      .closest('div')
      .get(`img[src="${author.profile?.avatarURL}"]`)
      .click();
  });

  function getRandomPostWithComments() {
    return Cypress._.sample(
      testPosts.filter((p) => testComments.some((c) => c.postId === p.id))
    ) as Post;
  }

  function getRandomRootCommentForPost(postId: number) {
    return Cypress._.sample(
      testComments.filter((c) => !c.threadParentId && c.postId === postId)
    ) as Comment;
  }

  function getAuthorForComment(comment: Comment) {
    return testUsers.find((u) => u.id === comment.userId) as PostFull['author'];
  }

  function getAuthorDisplayName(author: PostFull['author']) {
    return author.profile
      ? `${author.profile.firstName} ${author.profile.lastName}`
      : author.username;
  }
});
