const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

// Use the same-origin reverse-proxied API in production unless an explicit
// deployment-specific API base URL is configured.
export const API_BASE_URL = configuredApiBaseUrl || '/api';
export const IS_PROD = import.meta.env.PROD;
