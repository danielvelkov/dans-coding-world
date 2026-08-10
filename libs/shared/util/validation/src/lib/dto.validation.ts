import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  ApiException,
  createValidationErrorDetailsList,
} from '@dans-coding-world/api-exceptions';
import { ERROR_CODES } from '@dans-coding-world/shared-constants';

export async function transformAndValidateDto<T>(
  dto: object,
  dtoClass: ClassType<T>,
): Promise<T> {
  const dtoInstance = plainToInstance(dtoClass, dto);
  const errors = await validate(dtoInstance as object);

  if (errors.length) {
    throw new ApiException(
      ERROR_CODES.VALIDATION.VALIDATION_ERROR,
      undefined,
      createValidationErrorDetailsList(errors),
    );
  }
  return dtoInstance;
}
type ClassType<T> = new (...args: any[]) => T;
