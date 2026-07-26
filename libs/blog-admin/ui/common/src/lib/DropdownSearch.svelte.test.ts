import { type ComponentProps } from 'svelte';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { expect, it, describe, vi } from 'vitest';
import DropdownSearch from './DropdownSearch.svelte';

describe('DropdownSearch', () => {
  const options = [
    { value: '1', label: 'Alice' },
    { value: '2', label: 'Bob' },
  ];

  const renderFeature = async (
    params?: Partial<ComponentProps<typeof DropdownSearch>>,
  ) =>
    await render(DropdownSearch, {
      lastOptionRef: null,
      options,
      handleSelect: vi.fn(),
      handleSearch: vi.fn(),
      ...params,
    });

  const openDropdown = async () => {
    await page.getByRole('searchbox').click();
  };

  it('renders successfully', async () => {
    const screen = await renderFeature();
    expect(screen).toBeDefined();
  });

  it('renders search input with placeholder', async () => {
    await renderFeature({ placeHolder: 'Filter by author...' });
    await expect
      .element(page.getByRole('searchbox'))
      .toHaveAttribute('placeholder', 'Filter by author...');
  });

  it('opens dropdown on input focus', async () => {
    await renderFeature();
    await openDropdown();
    expect(page.getByRole('listbox')).toBeInTheDocument();
  });

  it('renders options when open', async () => {
    await renderFeature();
    await openDropdown();
    for (const { label } of options) {
      expect(page.getByRole('option', { name: label })).toBeInTheDocument();
    }
  });

  it('calls handleSelect and closes dropdown on option click', async () => {
    const handleSelect = vi.fn();
    await renderFeature({ handleSelect });
    await openDropdown();
    await page.getByRole('option', { name: 'Alice' }).click();
    expect(handleSelect).toHaveBeenCalledWith('1');
    await vi.waitFor(async () => {
      expect(page.getByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('marks selected options with aria-selected', async () => {
    await renderFeature({ selected: [{ value: '2' }] });
    await openDropdown();
    await expect
      .element(page.getByRole('option', { name: 'Bob' }))
      .toHaveAttribute('aria-selected', 'true');
    await expect
      .element(page.getByRole('option', { name: 'Alice' }))
      .toHaveAttribute('aria-selected', 'false');
  });

  it('calls handleSearch on input', async () => {
    const handleSearch = vi.fn();
    await renderFeature({ handleSearch });
    await page.getByRole('searchbox').fill('search term');
    expect(handleSearch).toHaveBeenCalledWith('search term');
  });

  it('displays error message when error prop is set', async () => {
    await renderFeature({ error: 'Failed to load' });
    await openDropdown();
    expect(page.getByText('Failed to load')).toBeInTheDocument();
  });

  it('displays searching loader when isSearching is true', async () => {
    await renderFeature({ isSearching: true, options: [] });
    await openDropdown();
    expect(page.getByText('Searching...')).toBeInTheDocument();
  });

  it('displays loading loader when isLoadingOptions and no options', async () => {
    await renderFeature({ isLoadingOptions: true, options: [] });
    await openDropdown();
    expect(page.getByText('Searching...')).toBeInTheDocument();
  });

  it('displays "No matches found" when options are empty and not loading', async () => {
    await renderFeature({ options: [] });
    await openDropdown();
    expect(page.getByText('No matches found')).toBeInTheDocument();
  });

  it('displays loading more indicator when isLoadingOptions and options exist', async () => {
    await renderFeature({ isLoadingOptions: true });
    await openDropdown();
    expect(page.getByText('Loading more options...')).toBeInTheDocument();
  });

  it('closes dropdown when close button is clicked', async () => {
    await renderFeature();
    await openDropdown();
    expect(page.getByRole('listbox')).toBeInTheDocument();
    await page.getByRole('button', { name: 'Close dropdown' }).click();
    await vi.waitFor(async () => {
      expect(page.getByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('closes dropdown when overlay is clicked', async () => {
    await renderFeature();
    await openDropdown();
    expect(page.getByRole('listbox')).toBeInTheDocument();
    await page.getByRole('button', { name: 'Close overlay' }).click();
    await vi.waitFor(async () => {
      expect(page.getByRole('listbox')).not.toBeInTheDocument();
    });
  });
});
