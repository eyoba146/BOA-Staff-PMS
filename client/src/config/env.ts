/**
 * Single access point for Vite environment variables. See client/.env.example.
 * Defaults favour local frontend development (mock adapters ON).
 */
const rawMock = import.meta.env.VITE_USE_MOCK_API;

export const env = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000/api',
  useMockApi: rawMock === undefined ? true : String(rawMock).toLowerCase() === 'true',
  appName: (import.meta.env.VITE_APP_NAME as string | undefined) ?? 'Staff Performance',
} as const;
