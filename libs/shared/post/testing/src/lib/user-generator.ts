import { User, UserPreview } from '@dans-coding-world/prisma-schema';
import {
  randEmail,
  randFirstName,
  randLastName,
  randNumber,
  randPassword,
  randSentence,
} from '@ngneat/falso';

export const generateRandomUserPreview = (): UserPreview => {
  const authorId = randNumber({ min: 1, max: 1000 });
  return {
    id: authorId,
    username: randFirstName() + randNumber({ min: 1, max: 1000 }),
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

export const generateRandomUser = (): User => {
  const authorId = randNumber({ min: 1, max: 1000 });
  return {
    id: authorId,
    username: randFirstName() + randNumber({ min: 1, max: 1000 }),
    password: randPassword(),
    email: randEmail(),
    isBanned: false,
    role: 'USER',
  };
};
