import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { expect, it, describe } from 'vitest';
import ReportsFilter from './ReportsFilter.svelte';

describe('ReportsFilter', () => {
  it('renders successfully', async () => {
    const screen = await render(ReportsFilter, {
      filters: { status: [] },
      onChange: vi.fn(),
    });
    expect(screen).toBeDefined();
  });

  it(`renders an option as unselectable if
     its the last selected`, async () => {
    const onChange = vi.fn();
    await render(ReportsFilter, {
      filters: { status: ['PENDING'] },
      onChange,
    });
    const option = page.getByRole('option', { name: 'Pending' });
    await expect.element(option).toHaveAttribute('disabled');
    await option.click({ force: true }); // force: true, because its disabled
    expect(onChange).not.toHaveBeenCalled();
  });
});
