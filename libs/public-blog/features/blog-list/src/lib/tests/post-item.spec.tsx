import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PostItem } from '../components/post-item';
import userEvent from '@testing-library/user-event';
import { mockPostItemData } from './mocks/post-item-data.mock';

const testPost = mockPostItemData[0];
const onTagClick = vi.fn();
const onAuthorClick = vi.fn();

const postItemProps = {
  post: testPost,
  onTagClick,
  onAuthorClick,
  isLocked: false,
};

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
      testPost.title
    );
  });

  it('renders the first paragraph of content as excerpt', () => {
    render(<PostItem {...postItemProps} />);
    const firstParagraphRegex = /^.*\n/;

    const matches = testPost.content.match(firstParagraphRegex);
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
      testPost.author.profile?.firstName +
      ' ' +
      testPost.author.profile?.lastName;
    expect(screen.getByText(`By ${fullName}`)).toBeInTheDocument();
  });

  it('renders image when user has avatarUrl provided', () => {
    render(<PostItem {...postItemProps} />);
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', testPost.author.profile?.avatarURL);
  });

  it('should not render image when no profile details setup', () => {
    const postWithoutAuthorProfile = {
      ...testPost,
      author: {
        ...testPost.author,
        profile: undefined,
      },
    };
    render(<PostItem {...postItemProps} post={postWithoutAuthorProfile} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders author username if user has no profile details setup', () => {
    render(
      <PostItem
        {...postItemProps}
        post={{
          ...testPost,
          author: { ...testPost.author, profile: undefined },
        }}
      ></PostItem>
    );
    const fullName = testPost.author.username;
    expect(screen.getByText(`By ${fullName}`)).toBeInTheDocument();
  });

  it('clicking on author calls the onAuthorClick handler', async () => {
    render(<PostItem {...postItemProps} />);
    const user = userEvent.setup();
    const fullName =
      testPost.author.profile?.firstName +
      ' ' +
      testPost.author.profile?.lastName;
    const authorButton = screen.getByText(`By ${fullName}`);

    await user.click(authorButton);

    expect(onAuthorClick).toHaveBeenCalledWith(testPost.author.id);
    expect(onAuthorClick).toHaveBeenCalledTimes(1);
  });

  it(`renders post's published date in format: DD MMM YYYY`, () => {
    render(<PostItem {...postItemProps} />);
    expect(screen.getByText(`01 Jan 2025`)).toBeInTheDocument();
  });

  it('renders post tags', () => {
    render(<PostItem {...postItemProps} />);
    if (!testPost.tags) throw new Error('Missing tags in test data');
    for (const tagName of testPost.tags)
      expect(screen.getByRole('button', { name: tagName })).toBeInTheDocument();
  });

  it('clicking tags calls the onTagClick handler', async () => {
    render(<PostItem {...postItemProps} />);
    const user = userEvent.setup();
    if (!testPost.tags) throw new Error('Missing tags in test data');
    for (const tagName of testPost.tags) {
      const tagButton = screen.getByRole('button', { name: tagName });

      await user.click(tagButton);

      expect(onTagClick).toHaveBeenCalledWith(tagName);
    }
    expect(onTagClick).toHaveBeenCalledTimes(testPost.tags.length);
  });
});
