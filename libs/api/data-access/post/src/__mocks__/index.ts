import {
  Post,
  PostWhereInput,
  PostOrderByInput,
} from '@dans-coding-world/prisma-schema';
import { IPostRepository } from '@dans-coding-world/shared-data-access-interfaces';

export class MockPostDataAccess
  implements IPostRepository<Post, PostWhereInput, PostOrderByInput>
{
  posts: Post[] = [];
  static nextId = 0;

  async getById(id: number): Promise<Post | null> {
    return this.posts.find((p) => p.id === id) ?? null;
  }
  async create(data: Omit<Post, 'id'>): Promise<Post> {
    const newPost: Post = { ...data, id: MockPostDataAccess.nextId++ };

    this.posts.push(newPost);

    return newPost;
  }
  async update(id: number, data: Partial<Post>): Promise<Post> {
    const postForUpdate = this.posts.find((p) => p.id === id);
    if (!postForUpdate) throw new Error('Post does not exist');

    this.posts = this.posts.map((p) => (p.id === id ? { ...p, ...data } : p));
    return { ...postForUpdate, ...data };
  }
  async search(
    where: PostWhereInput,
    orderBy?: PostOrderByInput,
    skip?: number,
    take?: number
  ): Promise<Post[]> {
    return this.posts
      .filter((p) => {
        if ('authorId' in where) return p.authorId === where.authorId;
        else if ('status' in where) return p.status === where.status;
        else if ('visibility' in where)
          return p.visibility === where.visibility;
        else if (Object.keys(where).length === 0) return true; // No where filter so get all
        return false;
      })
      .slice(skip, take)
      .sort((prev, next) => {
        if (orderBy?.publishedAt)
          return (
            (prev.publishedAt?.getTime() ?? 0) -
            (next.publishedAt?.getTime() ?? 0)
          );
        else return 0;
      });
  }
  async delete(id: number): Promise<Post> {
    const postForDeletion = this.posts.find((p) => p.id === id);
    if (!postForDeletion) throw new Error('Post does not exist');

    this.posts = this.posts.filter((p) => p.id !== id);
    return postForDeletion;
  }
  async deleteMany(where: PostWhereInput): Promise<number> {
    this.posts = this.posts.filter((p) => {
      if ('authorId' in where) return p.authorId === where.authorId;
      else if ('status' in where) return p.status === where.status;
      else if ('visibility' in where) return p.visibility === where.visibility;
      else if (Object.keys(where).length === 0) return true; // No where filter so get all
      return false;
    });
    return this.posts.length;
  }
  async exists(title: string): Promise<boolean> {
    return !!this.posts.find(
      (p) => p.title.toLowerCase() === title.toLowerCase()
    );
  }
}
