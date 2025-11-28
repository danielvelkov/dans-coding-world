import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsSortBy<T extends string>(
  allowedKeys: readonly T[],
  validationOptions?: ValidationOptions
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSortBy',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [allowedKeys],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (value === undefined || value === null) return true;

          if (typeof value !== 'object' || Array.isArray(value)) return false;

          const [allowedKeys] = args.constraints;
          const allowedDirections = ['asc', 'desc'];

          for (const [key, direction] of Object.entries(value)) {
            if (!allowedKeys.includes(key)) return false;

            if (!allowedDirections.includes(direction as string)) return false;
          }
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          const [allowedKeys] = args.constraints;
          return `sortBy must be an object with keys from [${allowedKeys.join(
            ', '
          )}] and values 'asc' or 'desc'`;
        },
      },
    });
  };
}
