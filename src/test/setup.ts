import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';

// ── localStorage / sessionStorage mock ───────────────────────────────────────
// jsdom provides these, but we reset them between tests to prevent state bleed.
afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

// ── fetch mock ────────────────────────────────────────────────────────────────
// Individual test files call vi.stubGlobal('fetch', ...) where needed.
// No global stub here so tests that don't mock fetch get a clear failure.
