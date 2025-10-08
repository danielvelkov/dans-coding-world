import { waitForPortOpen } from '@nx/node/utils';

/* eslint-disable */
var __TEARDOWN_MESSAGE__: string;

module.exports = async function () {
  try {
    // Start services that that the app needs to run (e.g. database, docker-compose, etc.).
    console.log('\nSetting up...\n');

    console.log('\nGetting host up...\n');
    const host = process.env.HOST ?? 'localhost';
    console.log('\nGetting port up...\n');
    const port = process.env.PORT ? Number(process.env.PORT) : 3000;
    console.log('\nResult:', { host, port });
    await waitForPortOpen(port, { host });

    // Hint: Use `globalThis` to pass variables to global teardown.
    globalThis.__TEARDOWN_MESSAGE__ = '\nTearing down...\n';
  } catch (err) {
    console.error('❌ Global setup failed:', err);

    // If it's an AggregateError, log each error
    if (err instanceof AggregateError) {
      for (const e of err.errors) {
        console.error('↪ Individual error:', e);
      }
    }

    throw err; // rethrow so Jest knows setup failed
  }
};
