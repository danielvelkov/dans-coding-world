/* eslint-disable playwright/no-conditional-in-test */
import type {
  Post,
  PostStatus,
  Role,
  Tag,
  User,
} from '@dans-coding-world/prisma-schema';
import { generateRandomString, randomSelect } from '@dans-coding-world/helpers';
import {
  ERROR_MESSAGES,
  ERROR_CODES,
  POST_CONSTRAINTS,
  TAG_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { test, expect, type Page } from '../fixtures/dbFixture';
import {
  checkIfLoggedIn,
  checkIfLoggedOut,
  login,
  loginAsRandomUser,
  logout,
} from '../helpers/user-login.helper';
import { waitOutLoader } from '../helpers/loading.helper';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import {
  fillContentEditor,
  fillFormFields,
} from '../helpers/posts-editor.helper';
import { generateRandomPosts } from '@dans-coding-world/shared-post-testing';

const EXISTING_POST_TITLE = 'Already Taken Post Title';
const VALID_CONTENT = 'This is enough content for the form.';

async function visitPost(page: Page, id: number) {
  await page.goto(`/posts/${id}/edit`);
}

async function setTitleBeyondMaxLength(page: Page, title: string) {
  const input = page.getByLabel(/^title$/i);
  await input.evaluate((el: HTMLInputElement) => {
    el.removeAttribute('maxlength');
    el.maxLength = 99999;
  });
  await input.fill(title);
}

test.describe('Edit post page', () => {
  let users: User[] = [];
  let seededTags: Tag[] = [];
  let seededPosts: Post[] = [];
  let publishedPostWithTags: Post;

  test.beforeAll(async ({ db }) => {
    users = await db.seedUsers({
      users: null,
      options: { clearExisting: true, useDefaults: true },
    });

    seededTags = await db.seedTags({
      tags: null,
      options: { clearExisting: true, useDefaults: true },
    });

    const author = users.find((u) => u.role === 'AUTHOR');
    const admin = users.find((u) => u.role === 'ADMIN');
    if (!admin || !author) throw new Error('Missing test users');

    const statuses: PostStatus[] = ['ARCHIVED', 'DRAFT', 'PUBLISHED'];

    seededPosts = await db.seedPosts({
      posts: [
        ...[author.id, admin.id].flatMap((authorId) =>
          generateRandomPosts(statuses.length).map((p, i) => ({
            title: p.title,
            content: p.content,
            visibility: 'PUBLIC',
            status: statuses[i],
            authorId,
          })),
        ),
      ],
      options: { clearExisting: true, useDefaults: true },
    });

    publishedPostWithTags = seededPosts.find(
      (p) => p.status === 'PUBLISHED',
    ) as Post;
    if (!publishedPostWithTags)
      throw new Error(
        'Missing Published post to attach tags to so as to make them public',
      );
    await db.attachTags({
      data: [
        {
          postId: publishedPostWithTags.id.toString(),
          tagIds: seededTags.map((t) => t.id.toString()),
        },
      ],
    });
  });

  test('shows 401 UNAUTHORIZED when not logged in', async ({ page }) => {
    await visitPost(page, randomSelect(seededPosts).id);
    await expect(page.getByText(/401/i)).toBeVisible();
    await expect(page.getByText(/authentication required/i)).toBeVisible();
  });

  test.describe('Authenticated AUTHOR/ADMIN', () => {
    let currentPostForEdit: Post;
    let loggedInUser: User;
    const allowedRoles: Role[] = ['ADMIN', 'AUTHOR'];

    test.beforeEach(async ({ page }) => {
      loggedInUser = await loginAsRandomUser(
        page,
        users.filter((u) => allowedRoles.includes(u.role)),
      );
      await waitOutLoader(page);
      expect(await checkIfLoggedIn(page)).toBe(true);
      currentPostForEdit = randomSelect(
        seededPosts.filter(
          (p) =>
            p.authorId === loggedInUser.id && p.id !== publishedPostWithTags.id,
        ),
      );
      await visitPost(page, currentPostForEdit.id);
      await waitOutLoader(page);
    });

    test('shows 404 "Not Found" message when post does not exist', async ({
      page,
    }) => {
      test.setTimeout(30_000);
      await visitPost(page, 9999);
      await waitOutLoader(page);
      await expect(page.getByText(/404/i)).toBeVisible();
      await expect(page.getByText(/not found/i)).toBeVisible();
    });

    test(`shows 403 "Forbidden" message when post exists but user
    has role AUTHOR and is not the author`, async ({ page }) => {
      test.setTimeout(30_000);
      await logout(page);
      await checkIfLoggedOut(page);
      loggedInUser = await loginAsRandomUser(
        page,
        users.filter((u) => u.role === 'AUTHOR'),
      );
      await waitOutLoader(page);
      expect(await checkIfLoggedIn(page)).toBe(true);
      const postByAnotherUser = randomSelect(
        seededPosts.filter(
          (p) =>
            p.authorId !== loggedInUser.id && p.id !== publishedPostWithTags.id,
        ),
      );
      if (!postByAnotherUser) throw new Error('Missing post');
      await visitPost(page, postByAnotherUser.id);
      await waitOutLoader(page);
      await expect(page.getByText(/403/i)).toBeVisible();
      await expect(page.getByText(/do not.*permission/i)).toBeVisible();
    });

    test(`admins can visit edit page of other user's private posts`, async ({
      page,
    }) => {
      test.setTimeout(30_000);
      await logout(page);
      await checkIfLoggedOut(page);
      loggedInUser = await loginAsRandomUser(
        page,
        users.filter((u) => u.role === 'ADMIN'),
      );
      await waitOutLoader(page);
      expect(await checkIfLoggedIn(page)).toBe(true);
      const privatePostByOtherUser = randomSelect(
        seededPosts.filter(
          (p) =>
            p.authorId !== loggedInUser.id &&
            (p.status === 'DRAFT' || p.status === 'ARCHIVED'),
        ),
      );
      if (!privatePostByOtherUser) throw new Error('Missing post');
      await visitPost(page, privatePostByOtherUser.id);
      await waitOutLoader(page);
      await expect(
        page.getByRole('heading', { name: /edit post/i }),
      ).toBeVisible();
    });

    test('contains "Edit post" heading with post ID', async ({ page }) => {
      await expect(
        page.getByRole('heading', { name: /edit post/i }),
      ).toBeVisible();
      await expect(
        page.getByText(new RegExp(`ID: ${currentPostForEdit.id}`, 'i')),
      ).toBeVisible();
    });

    test.describe('Form fields', () => {
      test('shows title input filled with the post title', async ({ page }) => {
        const titleInput = page.getByLabel(/^title$/i);
        await expect(titleInput).toBeVisible();
        await expect(titleInput).toHaveAttribute('id', 'title');
        await expect(titleInput).toHaveValue(currentPostForEdit.title);
      });

      test('shows current status of post', async ({ page }) => {
        await expect(
          page.getByText(`Current status: ${currentPostForEdit.status}`),
        ).toBeVisible();
      });

      test('shows editor and displays post content inside', async ({
        page,
      }) => {
        const editorEl = page.getByTestId('editor');
        await expect(editorEl).toContainText(currentPostForEdit.content);
      });

      test('checks "members-only" checkbox depending on post visibility', async ({
        page,
      }) => {
        const checkbox = page.getByLabel(/members.only/i);
        await expect(checkbox).toBeChecked({
          checked: currentPostForEdit.visibility === 'MEMBERS_ONLY',
        });
      });

      test('clicking on "members-only" checkbox toggles it', async ({
        page,
      }) => {
        const checkbox = page.getByLabel(/members.only/i);
        await expect(checkbox).toBeChecked({
          checked: currentPostForEdit.visibility === 'MEMBERS_ONLY',
        });
        await checkbox.click();
        await expect(checkbox).toBeChecked({
          checked: !(currentPostForEdit.visibility === 'MEMBERS_ONLY'),
        });
        await checkbox.click();
        await expect(checkbox).toBeChecked({
          checked: currentPostForEdit.visibility === 'MEMBERS_ONLY',
        });
      });

      test('search input shows all tags as options in dropdown on click', async ({
        page,
      }) => {
        await page.getByPlaceholder(/search tag/i).click();
        const listbox = page.getByTestId('dropdown-search-listbox');
        await expect(listbox).toBeInViewport();

        for (const tag of seededTags) {
          await expect(
            listbox.getByRole('option', { name: new RegExp(`#${tag.name}`) }),
          ).toBeAttached();
        }
      });

      test(`search input shows loading spinner in dropdown on click if
        while tags query resolves`, async ({ page }) => {
        test.setTimeout(30_000);
        await page.route(`**${API_ENDPOINTS.TAGS.LIST}**`, async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          await route.continue();
        });

        await page.goto('/posts/new');
        await page.getByPlaceholder(/search tag/i).click();
        await expect(page.getByTestId('dropdown-search-listbox')).toContainText(
          /searching/i,
        );
      });

      test(`selecting tag from search input dropdown adds it to selected tags`, async ({
        page,
      }) => {
        const tag = seededTags[0];
        await page.getByPlaceholder(/search tag/i).click();
        await page
          .getByTestId('dropdown-search-listbox')
          .getByRole('option', { name: new RegExp(`#${tag.name}`) })
          .click();
        await expect(page.getByTestId(`chip-${tag.name}`)).toBeVisible();
      });

      test('pressing [Enter] after inputting string in tag input adds to selected tags', async ({
        page,
      }) => {
        const customTag = `custom-${generateRandomString(6)}`;
        const tagInput = page.getByPlaceholder(/add tag.../i);
        await tagInput.fill(customTag);
        await tagInput.press('Enter');
        await expect(page.getByTestId(`chip-${customTag}`)).toBeVisible();
      });

      test('pressing [Backspace] on empty tag input removes last selected tag', async ({
        page,
      }) => {
        const first = `alpha-${generateRandomString(4)}`;
        const second = `beta-${generateRandomString(4)}`;
        const tagInput = page.getByPlaceholder(/add tag.../i);

        await tagInput.fill(first);
        await tagInput.press('Enter');
        await tagInput.fill(second);
        await tagInput.press('Enter');
        await expect(page.getByTestId(`chip-${first}`)).toBeVisible();
        await expect(page.getByTestId(`chip-${second}`)).toBeVisible();

        await tagInput.click();
        await expect(tagInput).toHaveValue('');
        await tagInput.press('Backspace');
        await expect(page.getByTestId(`chip-${second}`)).toBeHidden();
        await expect(page.getByTestId(`chip-${first}`)).toBeVisible();
      });

      test('user cannot enter an already added tag', async ({ page }) => {
        const tag = `dup-${generateRandomString(5)}`;
        const tagInput = page.getByPlaceholder(/add tag.../i);

        await tagInput.fill(tag);
        await tagInput.press('Enter');
        await expect(page.getByTestId(`chip-${tag}`)).toBeVisible();

        await tagInput.fill(tag);
        await tagInput.press('Enter');
        await expect(page.getByTestId(`chip-${tag}`)).toHaveCount(1);
      });

      test.describe('validation', () => {
        test('user cannot type into "Title" field past specified limit', async ({
          page,
        }) => {
          const longTitle =
            currentPostForEdit.title +
            generateRandomString(POST_CONSTRAINTS.MAX_TITLE_LENGTH + 20);
          const input = page.getByLabel(/^title$/i);
          await fillFormFields(page, longTitle);
          await expect(input).not.toHaveValue(longTitle);
          await expect(input).toHaveValue(
            longTitle.substring(0, POST_CONSTRAINTS.MAX_TITLE_LENGTH),
          );
        });

        test('user cannot save if title is too short', async ({ page }) => {
          const shortTitle = generateRandomString(
            POST_CONSTRAINTS.MIN_TITLE_LENGTH - 1,
          );
          await fillFormFields(page, shortTitle, undefined, VALID_CONTENT);
          await page.getByRole('button', { name: /save/i }).click();
          await expect(page.getByTestId('title-error')).toBeVisible();
          await expect(page.getByTestId('title-error')).toContainText(
            VALIDATION_MESSAGES.minLength(POST_CONSTRAINTS.MIN_TITLE_LENGTH),
          );
        });

        test('user cannot save if title is too long', async ({ page }) => {
          const longTitle =
            currentPostForEdit.title +
            generateRandomString(POST_CONSTRAINTS.MAX_TITLE_LENGTH + 5);
          await setTitleBeyondMaxLength(page, longTitle);
          await fillContentEditor(page, VALID_CONTENT);
          await page.getByRole('button', { name: /save/i }).click();
          await expect(page.getByTestId('title-error')).toBeVisible();
          await expect(page.getByTestId('title-error')).toContainText(
            VALIDATION_MESSAGES.maxLength(POST_CONSTRAINTS.MAX_TITLE_LENGTH),
          );
        });

        test('user cannot save if title is already used by another post', async ({
          db,
          page,
        }) => {
          test.slow();
          await db.seedPosts({
            posts: [
              {
                title: EXISTING_POST_TITLE,
                content: VALID_CONTENT,
                status: 'DRAFT',
                visibility: 'PUBLIC',
                authorId: loggedInUser.id,
              },
            ],
            options: { clearExisting: false, useDefaults: false },
          });
          await fillFormFields(
            page,
            EXISTING_POST_TITLE,
            undefined,
            VALID_CONTENT,
          );
          await page.getByRole('button', { name: /save/i }).click();
          await expect(page.getByTestId('post-form-error')).toBeVisible();
          await expect(page.getByTestId('post-form-error')).toContainText(
            ERROR_MESSAGES[ERROR_CODES.VALIDATION.POST_EXISTS],
          );
        });

        test('user cannot save if content is too short', async ({ page }) => {
          const shortContent = generateRandomString(
            POST_CONSTRAINTS.MIN_CONTENT_LENGTH - 1,
          );
          await fillFormFields(
            page,
            generateRandomString(10),
            undefined,
            shortContent,
          );
          await page.getByRole('button', { name: /save/i }).click();
          await expect(page.getByTestId('content-error')).toBeVisible();
          await expect(page.getByTestId('content-error')).toContainText(
            VALIDATION_MESSAGES.minLength(POST_CONSTRAINTS.MIN_CONTENT_LENGTH),
          );
        });

        test('user cannot save if content is too long', async ({ page }) => {
          test.setTimeout(30000);
          await fillFormFields(
            page,
            generateRandomString(10),
            false,
            generateRandomString(POST_CONSTRAINTS.MAX_CONTENT_LENGTH + 100),
          );
          await page.getByRole('button', { name: /save/i }).click();
          await expect(page.getByTestId('content-error')).toBeVisible();
          await expect(page.getByTestId('content-error')).toContainText(
            /formatted content is too large/i,
          );
        });

        test('user cannot enter a tag that is too short', async ({ page }) => {
          const shortTag = generateRandomString(
            TAG_CONSTRAINTS.MIN_NAME_LENGTH - 1,
          );
          const tagInput = page.getByPlaceholder(/add tag.../i);
          await tagInput.fill(shortTag);
          await tagInput.press('Enter');
          await expect(page.getByTestId(`chip-${shortTag}`)).toBeHidden();
          await expect(page.getByTestId('tag-error')).toBeVisible();
          await expect(page.getByTestId('tag-error')).toContainText(
            VALIDATION_MESSAGES.minLength(TAG_CONSTRAINTS.MIN_NAME_LENGTH),
          );
        });

        test('user cannot enter a tag that is too long', async ({ page }) => {
          const longTag = generateRandomString(
            TAG_CONSTRAINTS.MAX_NAME_LENGTH + 5,
          );
          const tagInput = page.getByPlaceholder(/add tag.../i);
          await tagInput.fill(longTag);
          await tagInput.press('Enter');
          await expect(page.getByTestId(`chip-${longTag}`)).toBeHidden();
          await expect(page.getByTestId('tag-error')).toBeVisible();
          await expect(page.getByTestId('tag-error')).toContainText(
            VALIDATION_MESSAGES.maxLength(TAG_CONSTRAINTS.MAX_NAME_LENGTH),
          );
        });

        test('user cannot enter a tag that contains invalid characters', async ({
          page,
        }) => {
          const invalidTag = `${generateRandomString(4)}_BAD`;
          const tagInput = page.getByPlaceholder(/add tag.../i);
          await tagInput.fill(invalidTag);
          await tagInput.press('Enter');
          await expect(page.getByTestId(`chip-${invalidTag}`)).toBeHidden();
          await expect(page.getByTestId('tag-error')).toBeVisible();
          await expect(page.getByTestId('tag-error')).toContainText(
            VALIDATION_MESSAGES.tags.invalid,
          );
        });
      });
    });

    test.describe('Content preview', () => {
      test('changing the text in editor updates it in post preview', async ({
        page,
      }) => {
        const text = 'Some html content';
        await fillContentEditor(page, text);
        await expect(page.getByTestId('preview')).toContainText(text);
      });

      test('selecting Headers format option from editor toolbar updates preview as HTML', async ({
        page,
      }) => {
        const content = 'Hello World';
        await fillContentEditor(page, content);
        const preview = page.getByTestId('preview');
        await expect(
          preview.getByRole('heading', { name: content }),
        ).toBeHidden();

        await page
          .locator('[data-testid="editor"] .ql-editor')
          .press('Control+A');
        await page.locator('.ql-picker.ql-header .ql-picker-label').click();
        await page
          .locator('.ql-picker.ql-header .ql-picker-item[data-value="1"]')
          .click();
        await expect(
          preview.getByRole('heading', { name: content, level: 1 }),
        ).toBeVisible();

        await page.locator('.ql-picker.ql-header .ql-picker-label').click();
        await page
          .locator('.ql-picker.ql-header .ql-picker-item[data-value="2"]')
          .click();
        await expect(
          preview.getByRole('heading', { name: content, level: 2 }),
        ).toBeVisible();
      });

      test('does not execute javascript inside post preview on update', async ({
        page,
      }) => {
        let dialogShown = false;
        page.on('dialog', async (dialog) => {
          dialogShown = true;
          await dialog.dismiss();
        });

        await page.evaluate(() => {
          const root = document.querySelector('[data-testid="editor"]') as {
            __quill?: {
              clipboard: {
                dangerouslyPasteHTML: (html: string) => void;
              };
            };
          } | null;
          root?.__quill?.clipboard.dangerouslyPasteHTML(
            '<img src="x" onerror="alert(\'hacked\')" width="0" height="0"><script>alert("hacked")</script>',
          );
        });

        const preview = page.getByTestId('preview');
        await expect(preview.locator('[onerror]')).toHaveCount(0);
        await expect(preview.locator('script')).toHaveCount(0);
        expect(dialogShown).toBe(false);
      });
    });

    test.describe('saving/publishing/archiving', () => {
      test('contains "save" action', async ({ page }) => {
        await expect(
          page.getByRole('button', { name: /^save$/i }),
        ).toBeVisible();
      });

      test('contains "Archive" action when editing post with status != archived', async ({
        page,
      }) => {
        const postThatsNotArchived = seededPosts.find(
          (p) => p.authorId === loggedInUser.id && p.status !== 'ARCHIVED',
        );
        if (!postThatsNotArchived) throw new Error('Missing post for user');
        await visitPost(page, postThatsNotArchived.id);
        await expect(
          page.getByRole('button', { name: /^archive$/i }),
        ).toBeVisible();
      });

      test(`does not contain "Archive" action when editing
         post with status ARCHIVED`, async ({ page }) => {
        const archivedPost = seededPosts.find(
          (p) => p.authorId === loggedInUser.id && p.status === 'ARCHIVED',
        );
        if (!archivedPost) throw new Error('Missing post for user');
        await visitPost(page, archivedPost.id);
        await expect(
          page.getByRole('button', { name: /^archive$/i }),
        ).toBeHidden();
      });

      test('contains "Unpublish" action when editing published post', async ({
        page,
      }) => {
        const publishedPost = seededPosts.find(
          (p) => p.status === 'PUBLISHED' && p.authorId === loggedInUser.id,
        );
        if (!publishedPost) throw new Error('Missing post');
        await visitPost(page, publishedPost.id);
        await expect(
          page.getByRole('button', { name: /^unpublish$/i }),
        ).toBeVisible();
      });

      test('contains "Publish" action when editing draft post', async ({
        page,
      }) => {
        const draftPost = seededPosts.find(
          (p) => p.authorId === loggedInUser.id && p.status === 'DRAFT',
        );
        if (!draftPost) throw new Error('Missing draft post for user');
        await visitPost(page, draftPost.id);
        await expect(
          page.getByRole('button', { name: /^Publish$/i }),
        ).toBeVisible();
      });

      test(`selecting "save" action on valid data updates post and
         shows info notification`, async ({ page }) => {
        test.slow();
        const title = generateRandomString(8);
        await fillFormFields(page, title, undefined, VALID_CONTENT);
        await page.getByRole('button', { name: /^save$/i }).click();

        await expect(page).toHaveURL(/\/posts\/\d+\/edit$/);
        await expect(page.getByText(/post.*saved/i)).toBeVisible();
        await expect(
          page.getByText(
            new RegExp(`current status:.*${currentPostForEdit.status}`, 'i'),
          ),
        ).toBeVisible();
        await expect(page.getByLabel(/^title$/i)).toHaveValue(title);
      });

      test('selecting "Publish" action on valid data opens confirmation dialog', async ({
        page,
      }) => {
        const draftPost = seededPosts.find(
          (p) => p.authorId === loggedInUser.id && p.status === 'DRAFT',
        );
        if (!draftPost) throw new Error('Missing draft post for user');
        await visitPost(page, draftPost.id);
        await fillFormFields(
          page,
          `Publish dialog ${generateRandomString(6)}`,
          undefined,
          VALID_CONTENT,
        );
        await page.getByRole('button', { name: /^publish$/i }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText(/confirm publish/i);
      });

      test(`selecting "Publish" action on valid data opens dialog
        which on confirmation updates post as PUBLISHED and
        shows info notification`, async ({ page }) => {
        test.slow();
        const title = generateRandomString(8);

        const draftPost = seededPosts.find(
          (p) => p.authorId === loggedInUser.id && p.status === 'DRAFT',
        );
        if (!draftPost) throw new Error('Missing draft post for user');
        await visitPost(page, draftPost.id);
        await expect(
          page.getByText(new RegExp(`current status:.*DRAFT`, 'i')),
        ).toBeVisible();
        await fillFormFields(page, title, undefined, VALID_CONTENT);
        await page.getByRole('button', { name: /^publish$/i }).click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', { name: /^confirm$/i }).click();

        await expect(page).toHaveURL(/\/posts\/\d+\/edit$/);
        await expect(page.getByText(/post.*saved/i)).toBeVisible();
        await expect(
          page.getByText(new RegExp(`current status:.*PUBLISHED`, 'i')),
        ).toBeVisible();
        await expect(page.getByLabel(/^title$/i)).toHaveValue(title);
        seededPosts[seededPosts.indexOf(draftPost)].status = 'PUBLISHED';
      });

      test(`selecting "Unpublish" action on valid data opens dialog
        which on confirmation updates post as DRAFT and
        shows info notification`, async ({ page }) => {
        test.slow();
        const title = generateRandomString(8);

        const publishedPost = seededPosts.find(
          (p) => p.authorId === loggedInUser.id && p.status === 'PUBLISHED',
        );
        if (!publishedPost) throw new Error('Missing published post for user');
        await visitPost(page, publishedPost.id);
        await expect(
          page.getByText(new RegExp(`current status:.*publish`, 'i')),
        ).toBeVisible();
        await fillFormFields(page, title, undefined, VALID_CONTENT);
        await page.getByRole('button', { name: /^unpublish$/i }).click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', { name: /^confirm$/i }).click();

        await expect(page).toHaveURL(/\/posts\/\d+\/edit$/);
        await expect(page.getByText(/post.*saved/i)).toBeVisible();
        await expect(
          page.getByText(new RegExp(`current status:.*DRAFT`, 'i')),
        ).toBeVisible();
        await expect(page.getByLabel(/^title$/i)).toHaveValue(title);
        seededPosts[seededPosts.indexOf(publishedPost)].status = 'DRAFT';
      });

      test(`selecting "Archive" action on valid data opens dialog
        which on confirmation updates post as ARCHIVED and
        shows info notification`, async ({ page }) => {
        test.slow();
        const title = generateRandomString(8);

        const publishedPost = seededPosts.find(
          (p) => p.authorId === loggedInUser.id && p.status === 'PUBLISHED',
        );
        if (!publishedPost) throw new Error('Missing published post for user');
        await visitPost(page, publishedPost.id);
        await expect(
          page.getByText(new RegExp(`current status:.*PUBLISHED`, 'i')),
        ).toBeVisible();
        await fillFormFields(page, title, undefined, VALID_CONTENT);
        await page.getByRole('button', { name: /^archive$/i }).click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', { name: /^confirm$/i }).click();

        await expect(page).toHaveURL(/\/posts\/\d+\/edit$/);
        await expect(page.getByText(/post.*saved/i)).toBeVisible();
        await expect(
          page.getByText(new RegExp(`current status:.*ARCHIVED`, 'i')),
        ).toBeVisible();
        await expect(page.getByLabel(/^title$/i)).toHaveValue(title);
        seededPosts[seededPosts.indexOf(publishedPost)].status = 'ARCHIVED';
      });
    });
  });

  test.describe('Logged in as User/Mod', () => {
    const allowedRoles: Role[] = ['USER', 'MOD'];
    test.beforeEach(async ({ page }) => {
      const user = users.find((u) => allowedRoles.includes(u.role));
      if (!user) throw new Error('Missing fixture');
      await page.goto('/login');
      await login(page, user.email, user.password);
      expect(await checkIfLoggedIn(page)).toBe(true);
    });

    test('shows 403 FORBIDDEN when trying to navigate to page', async ({
      page,
    }) => {
      await page.goto(`/posts/${publishedPostWithTags.id}/edit`);
      await expect(page.getByText(/403/i)).toBeVisible();
      await expect(
        page.getByText(/(access denied|do not have permission)/i),
      ).toBeVisible();
    });
  });
});
