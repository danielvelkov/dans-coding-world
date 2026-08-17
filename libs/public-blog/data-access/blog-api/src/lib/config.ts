export const getApiBaseURL = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;

  const host = import.meta.env.VITE_HOST || 'localhost';
  const port = import.meta.env.VITE_PORT || '3000';

  const protocol = host.includes('localhost') ? 'http' : 'https';

  return `${protocol}://${host}:${port}`;
};
