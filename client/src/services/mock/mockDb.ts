import { createSeed, MOCK_DB_VERSION, type MockDb } from './seed';

/**
 * In-browser mock database persisted to localStorage.
 * Exists only so the UI can be exercised before the Express API is available.
 */
const STORAGE_KEY = 'boa-pms.mock.db.v1';
const SESSION_KEY = 'boa-pms.mock.session';

let db: MockDb | null = null;

function load(): MockDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MockDb;
      if (parsed.version === MOCK_DB_VERSION) return parsed;
    }
  } catch {
    /* corrupted storage → reseed */
  }
  const seed = createSeed();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

export function getDb(): MockDb {
  if (!db) db = load();
  return db;
}

/** Persist after a mutation. */
export function commit(): void {
  if (db) localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function resetDb(): void {
  db = createSeed();
  commit();
}

// ---- Mock session (current user id) ----
export const mockSession = {
  get(): string | null {
    return localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
  },
  set(userId: string, remember: boolean) {
    (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, userId);
  },
  clear() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  },
};
