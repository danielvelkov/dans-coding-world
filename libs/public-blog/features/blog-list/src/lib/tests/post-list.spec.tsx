import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PostList, EMPTY_POSTS_MESSAGE } from '../components/post-list';
import { mockPosts } from './mocks/post-item-data.mock';

describe('PostList', () => {
  it('renders successfully', () => {
    const { baseElement } = render(<PostList posts={[...mockPosts]} />);
    expect(baseElement).toBeTruthy();
  });

  it('renders <ul> with the number of <li> equal to the passed posts', () => {
    render(<PostList posts={[...mockPosts]} />);
    const ul = screen.getByRole('list');
    expect(within(ul).getAllByRole('listitem').length).toBe(mockPosts.length);
  });

  it('renders PostItem components with correct props', () => {
    render(<PostList posts={[...mockPosts]} />);
    for (const post of mockPosts)
      expect(
        screen.getByRole('heading', { name: post.title })
      ).toBeInTheDocument();
  });

  it('renders message instead of <ul> for empty posts array', () => {
    render(<PostList posts={[]} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByText(EMPTY_POSTS_MESSAGE)).toBeInTheDocument();
  });
});
