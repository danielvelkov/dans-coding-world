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
    options?: {
      skip?: number;
      take?: number;
    }
  ): Promise<Post[]> {
    let filtered = this.posts.filter((post) => this.matchesWhere(post, where));

    // Apply sorting
    if (orderBy) {
      filtered = this.applySorting(filtered, orderBy);
    }

    // Apply pagination
    const skip = options?.skip ?? 0;
    const take = options?.take;

    return take !== undefined
      ? filtered.slice(skip, skip + take)
      : filtered.slice(skip);
  }
  async delete(id: number): Promise<Post> {
    const postForDeletion = this.posts.find((p) => p.id === id);
    if (!postForDeletion) throw new Error('Post does not exist');

    this.posts = this.posts.filter((p) => p.id !== id);
    return postForDeletion;
  }
  async deleteMany(where: PostWhereInput): Promise<number> {
    this.posts = this.posts.filter((post) => this.matchesWhere(post, where));
    return this.posts.length;
  }
  async exists(title: string): Promise<boolean> {
    return !!this.posts.find(
      (p) => p.title.toLowerCase() === title.toLowerCase()
    );
  }
  async count(where: PostWhereInput): Promise<number> {
    return this.posts.filter((post) => this.matchesWhere(post, where)).length;
  }

  private matchesWhere(post: Post, where: PostWhereInput): boolean {
    // Empty where clause matches everything
    if (!where || Object.keys(where).length === 0) return true;

    // Handle OR clause recursively
    if (where.OR) {
      return where.OR.some((condition) => this.matchesWhere(post, condition));
    }

    // Handle AND clause recursively
    if (where.AND && Array.isArray(where.AND)) {
      return where.AND.every((condition) => this.matchesWhere(post, condition));
    } else if (where.AND) return this.matchesWhere(post, where.AND);

    // Handle direct field comparisons
    return Object.entries(where).every(([key, value]) => {
      if (key === 'OR' || key === 'AND' || key === 'NOT') return true; // Already handled

      // Handle null/undefined checks
      if (value === null) return post[key as keyof Post] === null;
      if (value === undefined) return post[key as keyof Post] === undefined;

      // Direct equality
      return post[key as keyof Post] === value;
    });
  }

  private applySorting(posts: Post[], orderBy: PostOrderByInput): Post[] {
    return [...posts].sort((a, b) => {
      for (const [field, direction] of Object.entries(orderBy)) {
        const aVal = a[field as keyof Post];
        const bVal = b[field as keyof Post];

        // Handle null/undefined
        if (aVal === null || aVal === undefined)
          return direction === 'desc' ? 1 : -1;
        if (bVal === null || bVal === undefined)
          return direction === 'desc' ? -1 : 1;

        // Handle Date objects
        if (aVal instanceof Date && bVal instanceof Date) {
          const diff = aVal.getTime() - bVal.getTime();
          if (diff !== 0) return direction === 'desc' ? -diff : diff;
          continue;
        }

        // Handle strings and numbers
        if (aVal < bVal) return direction === 'desc' ? 1 : -1;
        if (aVal > bVal) return direction === 'desc' ? -1 : 1;
      }
      return 0;
    });
  }
}
