import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function IsOffsetAlignedWithSize(
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

          if (pageOffset === undefined || pageOffset === null) return true;

          if (pageSize === undefined || pageSize === null) return true;

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
