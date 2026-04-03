import '@testing-library/jest-dom'

// Polyfill localStorage for jsdom
const store = {}
const localStorageMock = {
  getItem: (key) => store[key] ?? null,
  setItem: (key, value) => { store[key] = String(value) },
  removeItem: (key) => { delete store[key] },
  clear: () => { Object.keys(store).forEach((key) => delete store[key]) },
}

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })
