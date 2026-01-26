const { Config } = require('jest');
const { getJestProjectsAsync } = require('@nx/jest');

module.exports = async (): Promise<typeof Config> => ({
  projects: await getJestProjectsAsync(),
});
