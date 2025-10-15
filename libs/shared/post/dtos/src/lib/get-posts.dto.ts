import {
  IsInt,
  IsOptional,
  IsIn,
  Min,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { VALIDATION_MESSAGES } from '@dans-coding-world/shared-constants';
import { PAGINATION } from '@dans-coding-world/shared-constants';
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
  pageOffset?: number = 0;

  @IsOptional()
  @IsIn(PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS, {
    message: VALIDATION_MESSAGES.allowedValues([
      ...PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS,
    ]),
  })
  pageSize?: AllowedPageSizes = PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE;
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
