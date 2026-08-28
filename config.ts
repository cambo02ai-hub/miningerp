const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const railwayApiBaseUrl = 'https://mellow-peace-production-95de.up.railway.app/api';

// Keep `/api` for local development, but use the Railway API in production when
// the frontend service has not yet received its VITE_API_BASE_URL variable.
export const API_BASE_URL =
  import.meta.env.PROD && (!configuredApiBaseUrl || configuredApiBaseUrl === '/api')
    ? railwayApiBaseUrl
    : configuredApiBaseUrl || '/api';
export const IS_PROD = import.meta.env.PROD;
