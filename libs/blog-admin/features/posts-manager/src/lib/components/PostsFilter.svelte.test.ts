import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { expect, it, describe } from 'vitest';
import PostsFilter from './PostsFilter.svelte';

describe('PostsFilter', () => {
  it('renders successfully', async () => {
    const screen = await render(PostsFilter, {
      filters: { status: [], visibility: [] },
      onChange: vi.fn(),
    });
    expect(screen).toBeDefined();
  });

  it(`renders an option as unselectable if
     its the last selected of "Status" options`, async () => {
    const onChange = vi.fn();
    await render(PostsFilter, {
      filters: { status: ['PUBLISHED'] },
      onChange,
    });
    const option = page.getByRole('option', { name: 'Published' });
    await expect.element(option).toHaveAttribute('disabled');
    await option.click({ force: true }); // force: true, because its disabled
    expect(onChange).not.toHaveBeenCalled();
  });

  it(`renders an option as unselectable if
     its the last selected of "Visibility" options`, async () => {
    const onChange = vi.fn();
    await render(PostsFilter, {
      filters: { visibility: ['MEMBERS_ONLY'] },
      onChange,
    });
    const option = page.getByRole('option', { name: 'Members-only' });
    await expect.element(option).toHaveAttribute('disabled');
    await option.click({ force: true }); // force: true, because its disabled
    expect(onChange).not.toHaveBeenCalled();
  });
});
