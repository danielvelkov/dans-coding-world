import {
  IsInt,
  IsOptional,
  IsIn,
  Min,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  MaxLength,
} from 'class-validator';
import {
  VALIDATION_MESSAGES,
  POST_CONSTRAINTS,
} from '@dans-coding-world/shared-constants';
import { PAGINATION } from '@dans-coding-world/shared-constants';
import {
  Post,
  PostStatus,
  PostVisibility,
} from '@dans-coding-world/prisma-schema';

export class GetPostsDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  viewerId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @IsOffsetAlignedWithSize('pageSize', {
    message: VALIDATION_MESSAGES.pagination.pageOffsetNotDivisibleByPageLimit,
  })
  pageOffset?: number;

  @IsOptional()
  @IsIn(PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS, {
    message: VALIDATION_MESSAGES.allowedValues([
      ...PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS,
    ]),
  })
  pageSize?: AllowedPageSizes;

  @IsOptional()
  sortBy?: Partial<
    Record<
      keyof Pick<Post, 'createdAt' | 'publishedAt' | 'updatedAt'>,
      'asc' | 'desc'
    >
  >;

  @IsOptional()
  filterBy?: {
    status?: PostStatus[];
    visibility?: PostVisibility[];
  };

  @IsOptional()
  @MaxLength(POST_CONSTRAINTS.MAX_TITLE_LENGTH, {
    message: VALIDATION_MESSAGES.maxLength(POST_CONSTRAINTS.MAX_TITLE_LENGTH),
  })
  searchQuery?: string;
}

type AllowedPageSizes =
  (typeof PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS)[number];

function IsOffsetAlignedWithSize(
  property: string,
  validationOptions?: ValidationOptions
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsOffsetAlignedWithSize',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [property],
      validator: {
        validate(pageOffset: any, args: ValidationArguments) {
          const [pageSizeKey] = args.constraints;
          const pageSize = (args.object as any)[pageSizeKey];
          return (
            typeof pageOffset === 'number' &&
            typeof pageSize === 'number' &&
            pageSize > 0 &&
            pageOffset % pageSize === 0
          );
        },
        defaultMessage(args: ValidationArguments) {
          const [limitKey] = args.constraints;
          return `${args.property} must be divisible by ${limitKey}`;
        },
      },
    });
  };
}
