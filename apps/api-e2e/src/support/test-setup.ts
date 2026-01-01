/* eslint-disable */
import axios from 'axios';

if (process.env.NODE_ENV !== 'test_e2e')
  throw new Error('NODE_ENV not in "test_e2e"');

module.exports = async function () {
  // Configure axios for tests to use.
  const host = process.env.HOST ?? 'localhost';
  const port = process.env.PORT ?? '3000';
  axios.defaults.baseURL = `http://${host}:${port}`;
};
