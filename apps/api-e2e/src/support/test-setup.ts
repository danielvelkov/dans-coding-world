/* eslint-disable */
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

if (process.env.NODE_ENV !== 'test_e2e')
  throw new Error('NODE_ENV not in "test_e2e"');

module.exports = async function () {
  // Configure axios for tests to use.
  const host = process.env.HOST ?? 'localhost';
  const port = process.env.PORT ?? '3000';

  // Create cookie jar
  const jar = new CookieJar();

  // Wrap axios with cookie jar support
  wrapper(axios);

  // Configure defaults
  axios.defaults.baseURL = `http://${host}:${port}`;
  axios.defaults.jar = jar;
  axios.defaults.withCredentials = true;
};
