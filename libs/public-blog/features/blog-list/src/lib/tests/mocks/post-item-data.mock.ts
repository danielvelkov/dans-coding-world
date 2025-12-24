import { PostItemData } from '../../types/post-item-data.types';

export const mockPosts: readonly PostItemData[] = [
  {
    id: 1,
    title: 'Random title',
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
  },
];
