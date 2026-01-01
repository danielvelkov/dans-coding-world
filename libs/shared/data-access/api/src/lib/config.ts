const getBaseUrl = () => {
  if (process.env.API_URL) return process.env.API_URL;

  const host = process.env.HOST || 'localhost';
  const port = process.env.PORT || '3000';

  const protocol = host.includes('localhost') ? 'http' : 'https';

  return `${protocol}://${host}:${port}`;
};

export const BASE_URL = getBaseUrl();
