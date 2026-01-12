import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PostList, EMPTY_POSTS_MESSAGE } from '../components/PostList';
import { mockPostItemData } from './mocks/post-item-data.mock';
import { PostItem } from '../components/PostItem';
import { MemoryRouter } from 'react-router-dom';

const validPostItemProps: Omit<Parameters<typeof PostItem>[0], 'post'> = {
  onTagClick: vi.fn(),
  isLocked: false,
};

const validList = (
  <MemoryRouter>
    <PostList>
      {mockPostItemData.map((p) => (
        <PostItem key={p.id} {...validPostItemProps} post={p}></PostItem>
      ))}
    </PostList>
  </MemoryRouter>
);

describe('PostList', () => {
  it('renders successfully', () => {
    const { baseElement } = render(validList);
    expect(baseElement).toBeTruthy();
  });

  it('renders <ul> with multiple of <li> equal to the passed post items', () => {
    render(validList);
    const ul = screen.getByRole('list');
    expect(within(ul).getAllByRole('listitem').length).toBe(
      mockPostItemData.length
    );
  });

  it('renders PostItem components details like title', () => {
    render(validList);
    for (const post of mockPostItemData)
      expect(
        screen.getByRole('heading', { name: post.title })
      ).toBeInTheDocument();
  });

  it('renders "no posts found" message instead of <ul> when no posts are passed', () => {
    render(<PostList children={[]} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByText(EMPTY_POSTS_MESSAGE)).toBeInTheDocument();
  });
});
