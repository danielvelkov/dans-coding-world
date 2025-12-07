import { client, ReportHistory } from '@dans-coding-world/prisma-schema';
import { SeedOptions } from './types/seed-options.js';

/**
 * @description ⚠️ **Test-only method.** This function is intended for development and testing purposes only.
 *
 * **🚨 Do not use in production.** It will delete existing report history data.
 *
 * @param customReportHistories Report Histories to create.
 * Make sure the users of the moderatorId, the reportId exist, otherwise an error will be thrown
 * @param options Seed options for whether to clear and reset the 'ReportHistory' table
 */
export const seedReportHistories = async (
  customReportHistories?: Omit<ReportHistory, 'id'>[],
  options: SeedOptions = { clearExisting: true }
): Promise<ReportHistory[]> => {
  if (!(process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'test_e2e'))
    throw new Error(
      'Not in test environment. Check your test setup configuration.'
    );
  try {
    const seeded: ReportHistory[] = [];
    if (options.clearExisting) {
      await client.reportHistory.deleteMany();
      await client.$queryRaw`ALTER SEQUENCE "ReportHistory_id_seq" RESTART WITH 1;`;
    }

    if (customReportHistories) {
      const reports = await createAndReturnReportHistoriesWithId(
        customReportHistories
      );
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

const createAndReturnReportHistoriesWithId = async (
  reportHistories: Omit<ReportHistory, 'id'>[]
) => {
  if (!reportHistories.length) return [];
  const createdReportHistories = await client.$transaction(
    reportHistories.map((reportHistory) =>
      client.reportHistory.create({ data: reportHistory })
    )
  );
  return createdReportHistories.map((u) => ({ ...u }));
};
