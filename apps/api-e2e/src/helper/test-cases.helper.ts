import { ERROR_CODES } from '@dans-coding-world/shared-constants';
import { createErrorCodeResponse } from './error-response.helper';

export const invalidIdTestCases = [
  ['is letter', 'a'],
  ['is special character', '@'],
  ['is decimal number', '12.34'],
  ['is negative number', '-5'],
  ['is boolean true', 'true'],
  ['is boolean false', 'false'],
  ['is null string', 'null'],
  ['is undefined string', 'undefined'],
];

export function testInvalidIds(
  testFn: (id: any) => Promise<any>,
  paramName = 'id'
) {
  test.each(invalidIdTestCases)(
    `should return validation error when ${paramName} %s`,
    async (_, id) => {
      await expect(testFn(id)).rejects.toMatchObject(
        createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR)
      );
    }
  );
}
