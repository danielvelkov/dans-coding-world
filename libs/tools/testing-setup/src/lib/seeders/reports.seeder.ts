import { client, Report } from '@dans-coding-world/prisma-schema';
import { SeedOptions } from './types/seed-options.js';

/**
 * @description ⚠️ **Test-only method.** This function is intended for development and testing purposes only.
 *
 * **🚨 Do not use in production.** It will delete existing report data.
 *
 * @param customReports Reports to create.
 * Make sure the users of the reporterId, the commentId exist, otherwise an error will be thrown
 * @param options Seed options for whether to clear and reset the 'Report' table
 */
export const seedReports = async (
  customReports?: Omit<Report, 'id'>[],
  options: SeedOptions = { clearExisting: true }
): Promise<Report[]> => {
  if (!(process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'test_e2e'))
    throw new Error(
      'Not in test environment. Check your test setup configuration.'
    );
  try {
    const seeded: Report[] = [];
    if (options.clearExisting) {
      await client.report.deleteMany();
    }

    if (customReports) {
      const reports = await createAndReturnReportsWithId(customReports);
      seeded.push(...reports);
    }

    return seeded;
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await client.$disconnect();
  }
};

const createAndReturnReportsWithId = async (reports: Omit<Report, 'id'>[]) => {
  if (!reports.length) return [];
  const createdReports = await client.$transaction(
    reports.map((report) => client.report.create({ data: report }))
  );
  return createdReports.map((u) => ({ ...u }));
};
