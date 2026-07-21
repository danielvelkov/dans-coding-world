import { type ComponentProps } from 'svelte';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import { expect, it, describe } from 'vitest';
import ChipInput from './ChipInput.svelte';

describe('ChipInput', () => {
  const renderFeature = async (
    params?: Partial<ComponentProps<typeof ChipInput>>,
  ) =>
    await render(ChipInput, {
      values: [],
      ...params,
    });

  it('renders successfully', async () => {
    const screen = await renderFeature();
    expect(screen).toBeDefined();
  });

  it('renders input with placeholder', async () => {
    const customPlaceholder = 'Add tag...';
    await renderFeature({ placeholder: customPlaceholder });
    await expect
      .element(page.getByRole('textbox'))
      .toHaveAttribute('placeholder', customPlaceholder);
  });

  it(`should add entered string as span element 
    on pressing enter or comma`, async () => {
    const [first, second] = ['tag-1', 'tag-2'];
    const user = userEvent.setup();

    await renderFeature();
    const input = page.getByRole('textbox');

    // using [Enter]
    await user.click(input);
    await user.keyboard(first);

    await expect.element(input).toHaveValue(first);
    expect(page.getByText(first)).not.toBeInTheDocument();

    await user.keyboard('[Enter]');
    expect(page.getByText(first)).toBeInTheDocument();

    // using comma
    await user.click(input);
    await user.keyboard(second);

    await expect.element(input).toHaveValue(second);
    expect(page.getByText(second)).not.toBeInTheDocument();

    await user.keyboard(',');
    expect(page.getByText(second)).toBeInTheDocument();
  });

  it('should remove last entered string on pressing backspace on empty input', async () => {
    const user = userEvent.setup();
    const tags = ['alpha', 'beta'];

    const screen = await renderFeature({ values: tags });
    const input = screen.getByRole('textbox');

    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('beta')).toBeInTheDocument();

    await user.click(input);

    await user.keyboard('[Backspace]');

    // last tag removed
    expect(screen.getByText('beta')).not.toBeInTheDocument();
    expect(screen.getByText('alpha')).toBeInTheDocument();
  });

  it('should remove entered string on pressing the "Remove" button inside of it', async () => {
    const user = userEvent.setup();
    const tags = ['one', 'two'];

    await renderFeature({ values: [...tags] });

    const removeButtons = page
      .getByRole('button', { name: /remove/i })
      .elements();

    // remove first tag
    await user.click(removeButtons[0]);

    expect(page.getByText('one')).not.toBeInTheDocument();
    expect(page.getByText('two')).toBeInTheDocument();
  });

  it('should not add another string as span if it already exists', async () => {
    const user = userEvent.setup();
    const tag = 'unique';

    await renderFeature({ values: [tag] });
    const input = page.getByRole('textbox');

    await user.click(input);
    await user.keyboard(tag);

    await expect.element(input).toHaveValue(tag);

    await user.keyboard('[Enter]');

    const occurrences = page.getByText(tag).elements();
    expect(occurrences.length).toBe(1);
  });

  it('should not add anything if [Enter] or comma pressed on an empty input', async () => {
    const user = userEvent.setup();

    await renderFeature();
    const input = page.getByRole('textbox');

    await user.click(input);
    await expect.element(input).toHaveValue('');

    await user.keyboard('[Enter]');
    await user.keyboard(',');

    // no tags should exist
    const chips = page.getByRole('button', { name: /remove/i }).elements();
    expect(chips.length).toBe(0);
  });

  describe('validation()', () => {
    it('should not add anything if [Enter] pressed and validate() cb returns false', async () => {
      const tag = 'tag-1';
      const user = userEvent.setup();

      await renderFeature({ validate: () => false });
      const input = page.getByRole('textbox');

      await user.click(input);

      await user.keyboard(`${tag}[Enter]`);
      await expect.element(input).toHaveValue(tag);

      // no tags should exist
      const chips = page.getByRole('button', { name: /remove/i }).elements();
      expect(chips.length).toBe(0);
    });

    it('should add as span if [Enter] pressed and validate() cb returns true', async () => {
      const tag = 'tag-1';
      const user = userEvent.setup();

      await renderFeature({ validate: () => true });
      const input = page.getByRole('textbox');

      await user.click(input);

      await user.keyboard(`${tag}[Enter]`);
      await expect.element(input).toHaveValue('');
      const chips = page.getByRole('button', { name: /remove/i }).elements();
      expect(chips.length).toBe(1);
    });
  });
});
