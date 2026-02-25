import { randNumber, randProgrammingLanguage } from '@ngneat/falso';

export function generateRandomTags({ length = 5 }) {
  return Array.from({ length }, () => ({
    id: randNumber({ min: 1, max: 1000 }),
    name: `${randNumber({ min: 1, max: 1000 })} - ${randProgrammingLanguage()}`,
  }));
}
