import { test, expect } from '../fixtures/authFixture';

test.describe.skip('Posts page - posts table', () => {
  test.skip('should redirect to login page if not logged in', async ({
    page,
  }) => {
    await page.goto('/posts');
    expect(page.url()).toMatch(/\/login$/);
  });

  test.describe.skip('Authenticated AUTHOR/MOD', () => {
    test.beforeEach(async ({ page }) => {
      // TODO - login as AUTHOR/MOD
      await page.goto('/posts');
    });

    test('contains "Your Posts" heading', async ({ page }) => {
      expect(await page.locator('h2').innerText()).toContain('Your Posts');
    });

    // test('each row contains main information about post', async () => {});
    // test('clicking "expand row" shows details about row', async () => {});
    // test(`selecting "Edit" link in "Actions" column
    //    navigates to post's edit page`, async () => {});
    // test(`clicking "Delete" for a row opens a confirmation dialog, which
    //   open confirmation successfully removes post`, async () => {});

    // test('does not contain "Author" column or "filter by user" combobox', async ({
    //   page,
    // }) => {});

    // test('does not show author details when expanding post', async () => {});
  });

  test.describe.skip('Authenticated ADMIN', () => {
    test.beforeEach(async ({ page }) => {
      // TODO - login as ADMIN
      await page.goto('/posts');
    });

    test('contains "All Posts" heading', async ({ page }) => {
      expect(await page.locator('h2').innerText()).toContain('All Posts');
    });

    // test('contains additional "Author" column', () => {});
    // test(`clicking the link inside row's "Author" column
    // navigates to /users?search={userId}`, () => {});
  });
});
