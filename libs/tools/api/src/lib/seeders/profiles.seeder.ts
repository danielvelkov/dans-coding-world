import profiles from '../data/profiles.json' with {type: "json"};
import { client, Profile } from '@dans-coding-world/prisma-schema';
import { SeedOptions } from './types/seed-options.js';

/**
 * @description ⚠️ **Test-only method.** This function is intended for development and testing purposes only.
 *
 * **🚨 Do not use in production.** It will delete existing profile data.
 *
 * @param customUserProfiles Profiles to create.
 * @param options Seed options for whether to clear and reset the 'Profile' table
 * 
 * *DEFAULT DATA*:
 * - Id: 1 - **Admin profile**
 * - Id: 2 - **Mod profile**
 * - Id: 3 - **User profile**
 * - Id: 4 - **Author profile**
 */
export const seedUserProfiles = async (
  customUserProfiles?: Profile[],
  options: SeedOptions = { clearExisting: true, useDefaults: true }
): Promise<Profile[]> => {
  if (!(process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'test_e2e'))
    throw new Error(
      'Not in test environment. Check your test setup configuration.'
    );
  try {
    const seeded: Profile[] = [];

    if (options.clearExisting) {
      await client.profile.deleteMany();
      await client.$queryRaw`ALTER SEQUENCE "Profile_id_seq" RESTART WITH 1;`;
    }

    if (options.useDefaults) {
      const defaultProfiles = await createAndReturnProfilesWithId(profiles)
      seeded.push(...defaultProfiles);
    }

    if (customUserProfiles) {
      const newProfiles = await createAndReturnProfilesWithId(customUserProfiles)
      seeded.push(...newProfiles);
    }
    return seeded;
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

const createAndReturnProfilesWithId = async (profiles: any[]) => {
  if(!profiles.length)
    return [];
  return await client.profile.createManyAndReturn(
    { data: profiles }
  );
};