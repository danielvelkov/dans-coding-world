import { UserPreview } from '@dans-coding-world/prisma-schema';
import {
  randFirstName,
  randLastName,
  randNumber,
  randSentence,
  randUserName,
} from '@ngneat/falso';

export const generateRandomUserPreview = (): UserPreview => {
  const authorId = randNumber({ min: 1, max: 1000 });
  return {
    id: authorId,
    username: randUserName(),
    profile: {
      id: randNumber({ min: 1, max: 1000 }),
      avatarURL: '',
      firstName: randFirstName(),
      lastName: randLastName(),
      bio: randSentence(),
      userId: authorId,
    },
  };
};
