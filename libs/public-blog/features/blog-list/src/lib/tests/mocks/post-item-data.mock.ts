import { BlogPostItem } from '../../types/post-item-data.types';

export const mockPostItemData: readonly BlogPostItem[] = [
  {
    id: 1,
    title: 'Random title',
    content: `Lorem ipsum dolor sit amet consectetur adipisicing elit. Neque dolorem hic totam, ut quis fuga quaerat dolores quam modi, nemo ipsam fugiat reiciendis magnam! 
    Dolore ducimus quis reiciendis minus enim.`,
    publishedAt: new Date(),
    updatedAt: new Date(),
    tags: ['random', 'tag-1', 'tag-2'],
    author: {
      id: 1,
      username: 'user123',
      profile: {
        avatarURL: 'URL',
        firstName: 'John',
        lastName: 'Doe',
      },
    },
  },
];
