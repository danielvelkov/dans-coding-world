import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PostItem } from '../components/post-item';
import userEvent from '@testing-library/user-event';
import { mockPostItemData } from './mocks/post-item-data.mock';
import { getFirstParagraph } from '../helper/post-content.util';

const testPost = mockPostItemData[0];
let postItemProps: Parameters<typeof PostItem>[0];

describe('PostItem', () => {
  beforeEach(() => {
    postItemProps = {
      post: testPost,
      onTagClick: vi.fn(),
      onAuthorClick: vi.fn(),
      isLocked: false,
      onClick: vi.fn(),
    };
  });
  it('renders successfully', () => {
    const { baseElement } = render(<PostItem {...postItemProps} />);
    expect(baseElement).toBeTruthy();
  });

  test('is an article inside a li', async () => {
    render(<PostItem {...postItemProps} />);
    const li = screen.getByRole('listitem');
    expect(await within(li).findByRole('article')).toBeInTheDocument();
  });

  it('renders post title as h2', () => {
    render(<PostItem {...postItemProps} />);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toMatch(
      testPost.title
    );
  });

  it('renders the first paragraph of content as excerpt and adds trailing dots', () => {
    render(<PostItem {...postItemProps} />);

    const firstParagraph = getFirstParagraph(testPost.content);

    expect(screen.getByRole('paragraph').textContent).toMatch(
      firstParagraph + '...'
    );
  });

  it(`displays 'members only' message when isLocked is true`, () => {
    render(<PostItem {...postItemProps} isLocked={true} />);
    expect(screen.getByText(/members only*/i)).toBeTruthy();
  });

  it(`hides post content paragraph when isLocked is true`, () => {
    render(<PostItem {...postItemProps} isLocked={true} />);
    expect(screen.queryByRole('paragraph')).toBeFalsy();
  });

  it('renders author full name if he has profile setup', () => {
    render(<PostItem {...postItemProps} />);
    const fullName =
      testPost.author.profile?.firstName +
      ' ' +
      testPost.author.profile?.lastName;
    expect(screen.getByText(`${fullName}`)).toBeInTheDocument();
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
        profile: null,
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
          author: { ...testPost.author, profile: null },
        }}
      ></PostItem>
    );
    const fullName = testPost.author.username;
    expect(screen.getByText(`${fullName}`)).toBeInTheDocument();
  });

  it('clicking on title calls the onClick handler when post is not locked', async () => {
    render(
      <PostItem
        {...postItemProps}
        post={{ ...postItemProps.post, id: 1 }}
        isLocked={false}
      />
    );
    const user = userEvent.setup();
    const title = screen.getByRole('heading', { level: 2 });

    await user.click(title);
    expect(postItemProps.onClick).toHaveBeenCalledTimes(1);
    expect(postItemProps.onClick).toHaveBeenCalledWith(postItemProps.post.id);
  });

  it('clicking on title does nothing when post IS locked', async () => {
    render(<PostItem {...postItemProps} isLocked={true} />);
    const user = userEvent.setup();
    const title = screen.getByRole('heading', { level: 2 });

    await user.click(title);

    expect(postItemProps.onClick).toHaveBeenCalledTimes(0);
    expect(postItemProps.onClick).not.toHaveBeenCalled();
  });

  it('clicking on author calls the onAuthorClick handler', async () => {
    render(<PostItem {...postItemProps} />);
    const user = userEvent.setup();
    const fullName =
      testPost.author.profile?.firstName +
      ' ' +
      testPost.author.profile?.lastName;
    const authorButton = screen.getByText(`${fullName}`);

    await user.click(authorButton);

    expect(postItemProps.onAuthorClick).toHaveBeenCalledTimes(1);
    expect(postItemProps.onAuthorClick).toHaveBeenCalledWith(
      testPost.author.id
    );
  });

  it(`renders post's published date in format: DD MMM YYYY`, () => {
    const publishedDate = '01 Mar 2025';
    render(
      <PostItem
        {...postItemProps}
        post={{ ...postItemProps.post, publishedAt: new Date(publishedDate) }}
      />
    );
    render(<PostItem {...postItemProps} />);
    expect(screen.getByText(`Posted on ${publishedDate}`)).toBeInTheDocument();
  });

  it(`renders when post was last edited if published date does 
    not equal last updatedDate`, () => {
    const editedDate = '12 Mar 2025';
    render(
      <PostItem
        {...postItemProps}
        post={{ ...postItemProps.post, updatedAt: new Date(editedDate) }}
      />
    );
    expect(screen.getByText(`Edited on ${editedDate}`)).toBeInTheDocument();
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

      expect(postItemProps.onTagClick).toHaveBeenCalledWith(tagName);
    }
    expect(postItemProps.onTagClick).toHaveBeenCalledTimes(
      testPost.tags.length
    );
  });
});
