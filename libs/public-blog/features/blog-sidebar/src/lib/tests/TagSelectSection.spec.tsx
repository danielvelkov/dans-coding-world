import { render, screen } from '@testing-library/react';
import { TagSelectSection } from '../components/TagSelectSection';

describe('TagsSelectList', () => {
  const validProps: Parameters<typeof TagSelectSection>[0] = {
    tags: ['tag-1', 'tag-2'],
    onTagSelect: vi.fn(),
  };

  it('renders successfully ', () => {
    const { baseElement } = render(
      <TagSelectSection {...validProps}></TagSelectSection>
    );
    expect(baseElement).toBeTruthy();
  });

  it('renders h3 with title "Tags"', () => {
    render(<TagSelectSection {...validProps}></TagSelectSection>);
    expect(screen.getByRole('heading', { name: 'Tags' })).toBeTruthy();
  });

  it('renders tags as buttons in a group', () => {
    render(<TagSelectSection {...validProps}></TagSelectSection>);

    validProps.tags.forEach((tag) => {
      expect(
        screen.getByRole('button', { name: new RegExp(tag) })
      ).toBeTruthy();
    });
  });
});
