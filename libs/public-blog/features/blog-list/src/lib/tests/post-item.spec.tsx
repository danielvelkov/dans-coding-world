import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PostItem } from '../components/post-item';
import { PostItemData } from '../types/post-item-data.types';
import userEvent from '@testing-library/user-event';

const post: PostItemData = {
  id: 1,
  title: 'Random title ',
  content: `Lorem ipsum dolor sit amet consectetur adipisicing elit. Neque dolorem hic totam, ut quis fuga quaerat dolores quam modi, nemo ipsam fugiat reiciendis magnam! 
    Dolore ducimus quis reiciendis minus enim.`,
  publishedAt: new Date(2025, 0, 1),
  tags: ['random', 'tag-1', 'tag-2'],
  author: {
    id: 1,
    username: 'user123',
    role: 'AUTHOR',
    profile: {
      avatarURL: 'URL',
      firstName: 'John',
      lastName: 'Doe',
    },
  },
};

const onTagClick = vi.fn();
const onAuthorClick = vi.fn();

const postItemProps = { post, onTagClick, onAuthorClick, isLocked: false };

describe('PostItem', () => {
  it('renders successfully', () => {
    const { baseElement } = render(<PostItem {...postItemProps} />);
    expect(baseElement).toBeTruthy();
  });

  test('is an article inside a li', async () => {
    render(<PostItem {...postItemProps} />);
    const li = screen.getByRole('listitem');
    expect(await within(li).findByRole('article')).toBeInTheDocument();
  });

  it('renders post title as h3', () => {
    render(<PostItem {...postItemProps} />);
    expect(screen.getByRole('heading', { level: 3 }).textContent).toMatch(
      post.title
    );
  });

  it('renders the first paragraph of content as excerpt', () => {
    render(<PostItem {...postItemProps} />);
    const firstParagraphRegex = /^.*\n/;

    const matches = post.content.match(firstParagraphRegex);
    if (!matches || matches.length === 0)
      throw new Error('Missing test paragraph in post content');

    expect(screen.getByRole('paragraph').textContent).toBe(matches[0]);
  });

  it('does not show content and displays login message when isLocked is true', () => {
    render(<PostItem {...postItemProps} isLocked={true} />);
    expect(screen.getByRole('paragraph').textContent).toMatch(/Login.*/gi);
  });

  it('renders author full name if he has profile setup', () => {
    render(<PostItem {...postItemProps} />);
    const fullName =
      post.author.profile?.firstName + ' ' + post.author.profile?.lastName;
    expect(screen.getByText(`By ${fullName}`)).toBeInTheDocument();
  });

  it('renders author username if user has no profile details setup', () => {
    render(
      <PostItem
        {...postItemProps}
        post={{
          ...post,
          author: { ...post.author, profile: undefined },
        }}
      ></PostItem>
    );
    const fullName = post.author.username;
    expect(screen.getByText(`By ${fullName}`)).toBeInTheDocument();
  });

  it('clicking on author calls the onAuthorClick handler', async () => {
    render(<PostItem {...postItemProps} />);
    const user = userEvent.setup();
    const fullName =
      post.author.profile?.firstName + ' ' + post.author.profile?.lastName;
    const authorButton = screen.getByText(`By ${fullName}`);

    await user.click(authorButton);

    expect(onAuthorClick).toHaveBeenCalledWith(post.author.id);
    expect(onAuthorClick).toHaveBeenCalledTimes(1);
  });

  it(`renders post's published date in format: DD MMM YYYY`, () => {
    render(<PostItem {...postItemProps} />);
    expect(screen.getByText(`01 Jan 2025`)).toBeInTheDocument();
  });

  it('renders post tags', () => {
    render(<PostItem {...postItemProps} />);
    if (!post.tags) throw new Error('Missing tags in test data');
    for (const tagName of post.tags)
      expect(screen.getByRole('button', { name: tagName })).toBeInTheDocument();
  });

  it('clicking tags calls the onTagClick handler', async () => {
    render(<PostItem {...postItemProps} />);
    const user = userEvent.setup();
    if (!post.tags) throw new Error('Missing tags in test data');
    for (const tagName of post.tags) {
      const tagButton = screen.getByRole('button', { name: tagName });

      await user.click(tagButton);

      expect(onTagClick).toHaveBeenCalledWith(tagName);
    }
    expect(onTagClick).toHaveBeenCalledTimes(post.tags.length);
  });
});
