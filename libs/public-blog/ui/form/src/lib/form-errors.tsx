import { getValidationErrors } from '@dans-coding-world/public-blog-shared-helpers';
import type { Dispatch, SetStateAction } from 'react';

export type FormErrors = Record<string, string>;
type InvalidMessageFormatter = (validationMessage: string) => string;

export const clearFieldError = (
  name: string,
  errors: FormErrors,
  setErrors: Dispatch<SetStateAction<FormErrors>>
) => {
  if (!errors[name]) return;
  setErrors((prev) => ({ ...prev, [name]: '' }));
};

export const getApiFieldErrors = <T extends string>(
  error: unknown,
  fields: T[]
) => getValidationErrors(error, fields);

export const createFieldInvalidHandler =
  <T extends HTMLInputElement | HTMLTextAreaElement>(
    setErrors: Dispatch<SetStateAction<FormErrors>>
  ) =>
  (
    e: React.InvalidEvent<T>,
    overwriteMessage: InvalidMessageFormatter = (message) => message
  ) => {
    e.preventDefault();
    const { name, validationMessage } = e.target;

    setErrors((prev) => ({
      ...prev,
      [name]: overwriteMessage(validationMessage),
    }));
  };
