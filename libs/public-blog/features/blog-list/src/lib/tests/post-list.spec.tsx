import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PostList, EMPTY_POSTS_MESSAGE } from '../components/post-list';
import { mockPosts } from './mocks/post-item-data.mock';
import { PostItem } from '../components/post-item';

const validProps = {
  onAuthorClick: vi.fn(),
  onTagClick: vi.fn(),
  isLocked: false,
};

const validList = (
  <PostList>
    {mockPosts.map((p) => (
      <PostItem key={p.id} {...validProps} post={p}></PostItem>
    ))}
  </PostList>
);

describe('PostList', () => {
  it('renders successfully', () => {
    const { baseElement } = render(validList);
    expect(baseElement).toBeTruthy();
  });

  it('renders <ul> with the number of <li> equal to the passed post items', () => {
    render(validList);
    const ul = screen.getByRole('list');
    expect(within(ul).getAllByRole('listitem').length).toBe(mockPosts.length);
  });

  it('renders PostItem components with correct props', () => {
    render(validList);
    for (const post of mockPosts)
      expect(
        screen.getByRole('heading', { name: post.title })
      ).toBeInTheDocument();
  });

  it('renders message instead of <ul> for empty posts array', () => {
    render(<PostList children={[]} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByText(EMPTY_POSTS_MESSAGE)).toBeInTheDocument();
  });
});
