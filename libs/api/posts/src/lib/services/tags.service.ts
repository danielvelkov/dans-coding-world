import { Tag, TagWhereInput } from '@dans-coding-world/prisma-schema';
import {
  GetTagsDto,
  GetTagsResponse,
  CreateTagDto,
  UpdateTagDto,
  DeleteTagDto,
  GetTagDto,
} from '@dans-coding-world/shared-post-dto';
import { Inject, Injectable } from 'injection-js';
import type { ITagRepository } from '@dans-coding-world/shared-data-access-interfaces';
import { transformAndValidateDto } from '@dans-coding-world/validation';
import { ApiException } from '@dans-coding-world/exceptions';
import {
  ERROR_CODES,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { ITagsService } from '../interfaces/tags-service.interface.js';

export const TAG_REPOSITORY_TOKEN = 'ITagsRepository';

@Injectable()
export class TagsService implements ITagsService {
  constructor(
    @Inject(TAG_REPOSITORY_TOKEN)
    public tags: ITagRepository<Tag, TagWhereInput>
  ) {}

  async getById(dto: GetTagDto): Promise<Tag> {
    dto = await transformAndValidateDto(dto, GetTagDto);

    const tag = await this.tags.getById(dto.tagId);
    if (!tag) throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);

    return tag;
  }

  async getAll(dto?: GetTagsDto): Promise<GetTagsResponse> {
    if (dto) dto = await transformAndValidateDto(dto, GetTagsDto);

    const items = await this.tags.search({
      posts: {
        some: dto?.viewerId
          ? {
              OR: [
                {
                  post: {
                    status: 'PUBLISHED',
                  },
                },
                {
                  post: {
                    status: { in: ['DRAFT', 'ARCHIVED'] },
                    authorId: dto.viewerId,
                  },
                },
              ],
            }
          : {
              post: {
                status: 'PUBLISHED',
              },
            },
      },
    });

    return {
      items,
      count: items.length,
    };
  }

  async create(dto: CreateTagDto): Promise<Tag> {
    dto = await transformAndValidateDto(dto, CreateTagDto);

    const tagExists = await this.tags.exists(dto.name);
    if (tagExists) throw new ApiException(ERROR_CODES.VALIDATION.TAG_EXISTS);

    const inputData: Parameters<typeof this.tags.create>[0] = {
      name: dto.name,
    };

    return await this.tags.create(inputData);
  }

  async delete(dto: DeleteTagDto): Promise<Tag> {
    dto = await transformAndValidateDto(dto, DeleteTagDto);

    const tag = await this.tags.getById(dto.tagId);

    if (!tag) throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);

    return await this.tags.delete(dto.tagId);
  }

  async update(dto: UpdateTagDto): Promise<Tag> {
    dto = await transformAndValidateDto(dto, UpdateTagDto);

    const tagForUpdate = await this.tags.getById(dto.tagId);
    if (!tagForUpdate) throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);

    if (tagForUpdate.name.toLowerCase() !== dto.name.toLowerCase()) {
      const tagExists = await this.tags.exists(dto.name);
      if (tagExists) throw new ApiException(ERROR_CODES.VALIDATION.TAG_EXISTS);
    }

    return await this.tags.update(dto.tagId, {
      name: dto.name,
    });
  }
}
