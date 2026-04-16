/**
 * Vitest setup file — runs before every test file.
 *
 * - Extends expect with DOM matchers (toBeInTheDocument, etc.)
 * - Mocks browser APIs that jsdom doesn't provide (localStorage, fetch, etc.)
 */

import "@testing-library/jest-dom";

/* ─── localStorage mock ──────────────────────────────────────────────── */

const store = {};
const localStorageMock = {
  getItem: (key) => store[key] ?? null,
  setItem: (key, value) => { store[key] = String(value); },
  removeItem: (key) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

/* ─── fetch mock (default: reject so tests must mock explicitly) ─────── */

global.fetch = vi.fn(() =>
  Promise.reject(new Error("fetch not mocked — use vi.fn() in your test"))
);

/* ─── window.location mock ───────────────────────────────────────────── */

delete window.location;
window.location = { href: "", assign: vi.fn(), replace: vi.fn() };

/* ─── SVG import mock (Vite imports SVGs as modules) ─────────────────── */
/* Handled via vite.config.js deps.inline or individual mocks in tests */

/* ─── cleanup between tests ──────────────────────────────────────────── */

afterEach(() => {
  localStorageMock.clear();
  vi.restoreAllMocks();
});
