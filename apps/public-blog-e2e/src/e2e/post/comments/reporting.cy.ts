import type {
  Comment,
  Post,
  Profile,
  User,
} from '@dans-coding-world/prisma-schema';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from '@dans-coding-world/shared-constants';
import type { UserDetail } from '@dans-coding-world/user-data-access';

describe('Comments - reporting', () => {
  let testPosts: Post[];
  let testComments: Comment[];
  const testUsers: UserDetail[] = [];

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
      testPosts = (posts as Post[]).filter((p) => p.status === 'PUBLISHED');
      if (!testPosts || !testPosts.length)
        throw new Error('Missing post fixtures');
    });

    cy.fixture('post/comments/sorting-dataset.json').then((fixtureComments) => {
      cy.task('db:seed-comments', {
        comments: [
          ...fixtureComments.map((c: Comment) => {
            if (!testPosts.map((p) => p.id).includes(c.postId))
              c.postId = Cypress._.sample(testPosts.map((p) => p.id)) as number;
            return c;
          }),
        ],
        options: { useDefaults: true, clearExisting: true },
      }).then((comments) => {
        testComments = comments as Comment[];
        if (!testPosts || !testPosts.length)
          throw new Error('Missing comment fixtures');
      });
    });
  });

  function getReporterScenario() {
    const reporter = testUsers.find((u) => u.role === 'USER') as UserDetail;
    if (!reporter) throw new Error('Missing user fixture');

    const publishedPostIds = new Set(
      testPosts.filter((p) => p.status === 'PUBLISHED').map((p) => p.id),
    );

    const ownComment = testComments.find(
      (c) =>
        c.depth === 0 &&
        publishedPostIds.has(c.postId) &&
        c.userId === reporter.id,
    ) as Comment;
    const othersComment = testComments.find(
      (c) =>
        c.depth === 0 &&
        publishedPostIds.has(c.postId) &&
        c.userId !== reporter.id &&
        c.postId === ownComment?.postId,
    ) as Comment;

    if (!ownComment || !othersComment)
      throw new Error('Missing comment fixtures for reporting');

    return { reporter, ownComment, othersComment, postId: ownComment.postId };
  }

  it('does not display report button, if logged out', () => {
    const { postId } = getReporterScenario();
    cy.visit(`/blog/${postId}`);
    cy.contains('button', 'Report').should('not.exist');
  });

  // TODO: Flaky
  context('Authenticated users', () => {
    beforeEach(() => {
      const { reporter, postId } = getReporterScenario();

      cy.visit('/login');
      cy.login(reporter.email, reporter.password);
      cy.url().should('match', /\/blog$/);
      cy.checkIfLoggedIn();
      cy.contains(reporter.email).should('exist');
      cy.visit(`/blog/${postId}`);
    });

    it('should not show report button on own comments', () => {
      const { ownComment } = getReporterScenario();
      cy.getByTestId(`comment-${ownComment.id}`)
        .contains('button', 'Report')
        .should('not.exist');
    });

    it('opens modal for selecting report reason', () => {
      const { othersComment } = getReporterScenario();
      cy.getByTestId(`comment-${othersComment.id}`)
        .contains('button', 'Report')
        .click();

      cy.get('dialog')
        .should('be.visible')
        .within(() => {
          cy.contains('h2', 'Report Comment');
          cy.contains('Select report reason:');
          cy.contains('label', 'Inappropriate comment');
          cy.contains('label', 'Spam');
          cy.contains('label', 'Harassment or abusive behavior');
          cy.contains('label', 'Misinformation or misleading content');
          cy.contains('button', 'Submit');
          cy.contains('button', 'Cancel');
        });
    });

    it('disables submit report button in modal if no reason selected', () => {
      const { othersComment } = getReporterScenario();
      cy.getByTestId(`comment-${othersComment.id}`)
        .contains('button', 'Report')
        .click();

      cy.get('dialog').within(() => {
        cy.contains('button', 'Submit').should('be.disabled');
        cy.contains('label', 'Spam').click();
        cy.contains('button', 'Submit').should('not.be.disabled');
      });
    });

    it('hides create report modal on clicking "Cancel"', () => {
      const { othersComment } = getReporterScenario();
      cy.getByTestId(`comment-${othersComment.id}`)
        .contains('button', 'Report')
        .click();

      cy.get('dialog').should('be.visible');
      cy.get('dialog').contains('button', 'Cancel').click();
      cy.get('dialog').should('not.exist');
      cy.getByTestId(`comment-${othersComment.id}`)
        .contains('button', 'Report')
        .should('exist');
    });

    it('should show an error if trying to report the same comment twice', () => {
      const { othersComment } = getReporterScenario();

      cy.getByTestId(`comment-${othersComment.id}`)
        .contains('button', 'Report')
        .click();
      cy.get('dialog').within(() => {
        cy.contains('label', 'Inappropriate comment').click();
        cy.contains('button', 'Submit').click();
      });
      cy.get('dialog').should('not.exist');

      cy.getByTestId(`comment-${othersComment.id}`)
        .contains('button', 'Report')
        .click();
      cy.get('dialog').within(() => {
        cy.contains('label', 'Spam').click();
        cy.contains('button', 'Submit').click();
        cy.getByTestId('error-message').should(
          'contain.text',
          ERROR_MESSAGES[ERROR_CODES.VALIDATION.REPORT_EXISTS],
        );
      });
    });

    it('should display error if comment does not exist anymore', () => {
      const { othersComment } = getReporterScenario();
      cy.intercept('POST', API_ENDPOINTS.REPORTS.COMMENTS.LIST, {
        success: false,
        error: {
          status: 404,
          message: ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND],
          errorCode: ERROR_CODES.SERVER.NOT_FOUND,
        },
      }).as('createReport');

      cy.getByTestId(`comment-${othersComment.id}`)
        .contains('button', 'Report')
        .click();
      cy.get('dialog').within(() => {
        cy.contains('label', 'Inappropriate comment').click();
        cy.contains('button', 'Submit').click();
      });

      cy.wait('@createReport');
      cy.get('dialog').within(() => {
        cy.getByTestId('error-message').should(
          'contain.text',
          ERROR_MESSAGES[ERROR_CODES.SERVER.NOT_FOUND],
        );
      });
    });
  });
});
