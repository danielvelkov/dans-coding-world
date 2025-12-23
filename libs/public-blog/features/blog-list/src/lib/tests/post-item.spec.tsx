import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PostItem } from '../components/post-item';
import { PostItemData } from '../types/post-item-data.types';

const postData: PostItemData = {
  id: 1,
  title: 'Random title ',
  content: `Lorem ipsum dolor sit amet consectetur adipisicing elit. Neque dolorem hic totam, ut quis fuga quaerat dolores quam modi, nemo ipsam fugiat reiciendis magnam! 
    Dolore ducimus quis reiciendis minus enim.`,
  publishedAt: new Date(),
  visibility: 'PUBLIC',
  tags: ['random'],
  author: {
    avatarURL: 'URL',
    firstName: 'John',
    lastName: 'Doe',
    userId: 1,
  },
};

describe('PostItem', () => {
  beforeEach(() => render(<PostItem post={postData} />));

  it('renders successfully', () => {
    const { baseElement } = render(<PostItem post={postData} />);
    expect(baseElement).toBeTruthy();
  });

  test('is an article inside a li', async () => {
    const li = screen.getByRole('listitem');
    expect(await within(li).findByRole('article')).toBeInTheDocument();
  });

  it('renders post title as h3', () => {
    expect(screen.getByRole('heading', { level: 3 }).textContent).toMatch(
      postData.title
    );
  });

  it('renders the first paragraph of content as excerpt', () => {
    const firstParagraphRegex = /^.*\n/;

    const matches = postData.content.match(firstParagraphRegex);
    if (!matches || matches.length === 0)
      throw new Error('Missing test paragraph in post content');

    expect(screen.getByRole('paragraph').textContent).toBe(matches[0]);
  });
});
