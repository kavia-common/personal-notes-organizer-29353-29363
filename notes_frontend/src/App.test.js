import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import App from './App';

// Helper: simple storage mock with in-memory state
function createLocalStorageMock() {
  let store = {};
  return {
    getItem: jest.fn((key) => (key in store ? store[key] : null)),
    setItem: jest.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    // Allow tests to inspect internal store
    __getStore: () => store,
    __setStoreRaw: (obj) => {
      store = { ...obj };
    },
  };
}

beforeEach(() => {
  // Mock localStorage before each test to ensure isolation and avoid real browser storage
  const ls = createLocalStorageMock();
  Object.defineProperty(window, 'localStorage', {
    value: ls,
    configurable: true,
    writable: true,
  });

  // Reset URL hash (App uses hash-based selection)
  window.location.hash = '';
});

afterEach(() => {
  // Cleanup DOM and timers
  jest.clearAllMocks();
  jest.useRealTimers();
});

test("renders 'New Note' button and search input", async () => {
  render(<App />);

  // New Note button should be available (either topbar or sidebar); prefer role/name query
  const newNoteButtons = screen.getAllByRole('button', { name: /new note/i });
  expect(newNoteButtons.length).toBeGreaterThan(0);

  // Search input: available by role (searchbox) or placeholder/aria-label
  // Try role=searchbox first
  let search;
  try {
    search = screen.getByRole('searchbox', { name: /search notes/i });
  } catch {
    // Fallback to placeholder in case role cannot be resolved in environment
    search =
      screen.getByPlaceholderText(/search notes/i) ||
      screen.getByLabelText(/search notes/i);
  }
  expect(search).toBeInTheDocument();
});

test("clicking 'New Note' creates a sidebar item and renders editor fields", async () => {
  // Use fake timers to control debounced persistence and any setTimeout used for hydration/focus
  jest.useFakeTimers();

  render(<App />);

  // Click "New Note" - prefer topbar button for clear intent, but any "New Note" works
  const newNoteBtn = screen.getAllByRole('button', { name: /new note/i })[0];
  fireEvent.click(newNoteBtn);

  // Allow async effects and debounced timers to settle
  // The app sets a 0ms setTimeout for hydration; run all timers to flush
  await act(async () => {
    jest.runOnlyPendingTimers();
  });

  // Sidebar list item should appear with "Untitled" title (default title)
  // Sidebar items render buttons with aria-label "Open note: <title>"
  const openNoteButton = await screen.findByRole('button', { name: /open note: untitled/i });
  expect(openNoteButton).toBeInTheDocument();

  // Editor fields should be present: title input and content textarea
  const titleInput = screen.getByLabelText(/note title/i);
  const contentTextarea = screen.getByLabelText(/note content/i);

  expect(titleInput).toBeInTheDocument();
  expect(contentTextarea).toBeInTheDocument();

  // Update title and content to ensure bindings work
  fireEvent.input(titleInput, { target: { value: 'My First Note' } });
  fireEvent.input(contentTextarea, { target: { value: 'Hello world!' } });

  // The controlled fields should reflect updates immediately
  expect(titleInput).toHaveValue('My First Note');
  expect(contentTextarea).toHaveValue('Hello world!');

  // Optionally verify the sidebar now shows updated title in its item
  // The item label is "Open note: <title>"
  const updatedOpenNoteButton = await screen.findByRole('button', {
    name: /open note: my first note/i,
  });
  expect(updatedOpenNoteButton).toBeInTheDocument();

  // Let debounced save run to ensure persistence writes happen
  await act(async () => {
    jest.runAllTimers();
  });

  // Assert that localStorage.setItem was called at least once for saving
  // The storage layer uses key 'notes.v1'
  const ls = window.localStorage;
  const setItemCalls = ls.setItem.mock.calls.filter((c) => c[0] === 'notes.v1');
  expect(setItemCalls.length).toBeGreaterThan(0);

  // The stored JSON should contain our updated title/content
  const lastSavedPayload = setItemCalls.at(-1)?.[1];
  expect(typeof lastSavedPayload).toBe('string');
  const parsed = JSON.parse(lastSavedPayload);
  expect(Array.isArray(parsed)).toBe(true);
  expect(parsed.length).toBeGreaterThan(0);
  // The first item is likely the one just created (hook prepends). Verify any item matches our title/content.
  const hasUpdated = parsed.some(
    (n) => (n.title || '').includes('My First Note') && (n.content || '').includes('Hello world!')
  );
  expect(hasUpdated).toBe(true);
});

test('search input is interactive and filters sidebar results (basic presence test)', async () => {
  jest.useFakeTimers();
  render(<App />);

  // Create two notes quickly
  const newNoteButtons = screen.getAllByRole('button', { name: /new note/i });
  fireEvent.click(newNoteButtons[0]);
  await act(async () => jest.runOnlyPendingTimers());
  // Update title to Foo
  const titleInput = screen.getByLabelText(/note title/i);
  fireEvent.input(titleInput, { target: { value: 'Foo' } });
  await act(async () => jest.runOnlyPendingTimers());

  // Create another note
  fireEvent.click(newNoteButtons[0]);
  await act(async () => jest.runOnlyPendingTimers());
  const titleInput2 = screen.getByLabelText(/note title/i);
  fireEvent.input(titleInput2, { target: { value: 'Bar' } });
  await act(async () => jest.runOnlyPendingTimers());

  // Now filter using search input for "Bar"
  let search;
  try {
    search = screen.getByRole('searchbox', { name: /search notes/i });
  } catch {
    search =
      screen.getByPlaceholderText(/search notes/i) ||
      screen.getByLabelText(/search notes/i);
  }
  fireEvent.change(search, { target: { value: 'Bar' } });

  // After filtering, expect only "Open note: Bar" item to be present (at least visible)
  const barItem = await screen.findByRole('button', { name: /open note:\s*bar/i });
  expect(barItem).toBeInTheDocument();

  // "Foo" might be filtered out - we can assert it is not found in the current list region
  const listRegion = screen.getByRole('listbox', { name: /notes list/i });
  const { queryByRole } = within(listRegion);
  expect(queryByRole('button', { name: /open note:\s*foo/i })).toBeNull();

  await act(async () => jest.runAllTimers());
});
