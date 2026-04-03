import '@testing-library/jest-dom'

// Polyfill localStorage for jsdom
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string): string | null => store[key] ?? null,
  setItem: (key: string, value: string): void => { store[key] = String(value) },
  removeItem: (key: string): void => { delete store[key] },
  clear: (): void => { Object.keys(store).forEach((key) => delete store[key]) },
}

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })
