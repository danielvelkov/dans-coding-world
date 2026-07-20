export const FORM_ACTIONS = [
  'Save',
  'Publish',
  'Archive',
  'Unpublish',
  'Save as Draft',
] as const;

export type FormAction = (typeof FORM_ACTIONS)[number];
