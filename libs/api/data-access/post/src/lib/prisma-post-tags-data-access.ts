import { client } from '@dans-coding-world/prisma-schema';
import type { Tag, TagWhereInput } from '@dans-coding-world/prisma-schema';
import { ITagRepository } from '@dans-coding-world/shared-data-access-interfaces';

export class PrismaPostTagsDataAccess implements ITagRepository<
  Tag,
  TagWhereInput
> {
  async getById(id: number): Promise<Tag | null> {
    return await client.tag.findFirst({
      where: {
        id,
      },
    });
  }

  async search(where?: TagWhereInput): Promise<Tag[]> {
    return await client.tag.findMany({
      where,
    });
  }

  async create(data: Omit<Tag, 'id'>): Promise<Tag> {
    return await client.tag.create({
      data,
    });
  }

  async update(id: number, data: Partial<Tag>): Promise<Tag> {
    return await client.tag.update({
      where: {
        id,
      },
      data,
    });
  }

  async delete(id: number): Promise<Tag> {
    return await client.tag.delete({
      where: {
        id,
      },
    });
  }

  async deleteMany(where: TagWhereInput): Promise<number> {
    const { count } = await client.tag.deleteMany({
      where,
    });
    return count;
  }

  async count(where: TagWhereInput): Promise<number> {
    return await client.tag.count({
      where,
    });
  }

  async exists(name: string): Promise<boolean> {
    const tag = await client.tag.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive', // Case-insensitive match
        },
      },
    });

    return !!tag;
  }
}
