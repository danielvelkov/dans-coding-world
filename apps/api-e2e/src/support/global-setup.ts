import { waitForPortOpen } from '@nx/node/utils';

/* eslint-disable */
var __TEARDOWN_MESSAGE__: string;

module.exports = async function () {
  try {
    // Start services that that the app needs to run (e.g. database, docker-compose, etc.).
    console.log('\nSetting up...\n');

    const host = process.env.API_HOST ?? 'localhost';
    const port = process.env.API_PORT ? Number(process.env.API_PORT) : 3000;
    await waitForPortOpen(port, { host });

    // Hint: Use `globalThis` to pass variables to global teardown.
    globalThis.__TEARDOWN_MESSAGE__ = '\nTearing down...\n';
  } catch (err) {
    console.error('❌ Global setup failed:', err);
    throw err; // rethrow so Jest knows setup failed
  }
};
