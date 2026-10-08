/**
 * Single access point for Vite environment variables. See client/.env.example.
 * Defaults favour local frontend development (mock adapters ON).
 */
const metaEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : undefined;
const rawMock = metaEnv?.VITE_USE_MOCK_API;

export const env = {
  apiBaseUrl: (metaEnv?.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000/api',
  useMockApi: rawMock === undefined ? true : String(rawMock).toLowerCase() === 'true',
  appName: (metaEnv?.VITE_APP_NAME as string | undefined) ?? 'Staff Performance',
} as const;
