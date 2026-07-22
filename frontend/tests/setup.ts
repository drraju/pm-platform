import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

const localStorageStore = new Map<string, string>();

Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    clear: vi.fn(() => localStorageStore.clear()),
    getItem: vi.fn((key: string) => localStorageStore.get(key) ?? null),
    removeItem: vi.fn((key: string) => {
      localStorageStore.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      localStorageStore.set(key, String(value));
    }),
  },
});

afterEach(() => {
  cleanup();
  if (typeof window.localStorage.clear === "function") {
    window.localStorage.clear();
  } else {
    localStorageStore.clear();
  }
  vi.useRealTimers();
});
