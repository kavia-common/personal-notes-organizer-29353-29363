const STORAGE_KEY = 'notes.v1';

/**
 * Internal in-memory fallback store used when localStorage is unavailable.
 */
let memoryStore = { [STORAGE_KEY]: '[]' };

/**
 * Returns a Web Storage-like object if available, otherwise null.
 * This guards against SSR and browser privacy modes where localStorage
 * access may throw.
 */
function getLocalStorageSafe() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Test access as some browsers throw on get/set even if defined.
      const testKey = '__ls_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    }
  } catch {
    // fall back to memory
  }
  return null;
}

// PUBLIC_INTERFACE
export const STORAGE = getLocalStorageSafe();

/**
 * PUBLIC_INTERFACE
 * safeParse
 * Safely parse a JSON string, returning a default value on failure.
 * @param {string} value - JSON string to parse
 * @param {*} fallback - Value to return on error (default: null)
 * @returns {*}
 */
export function safeParse(value, fallback = null) {
  /** Safely parses JSON, returning fallback when invalid. */
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * PUBLIC_INTERFACE
 * safeStringify
 * Safely stringify a JS value, returning a default value on failure.
 * @param {*} value - Value to stringify
 * @param {string} fallback - Value to return on error (default: 'null')
 * @returns {string}
 */
export function safeStringify(value, fallback = 'null') {
  /** Safely stringifies to JSON, returning fallback when circular or invalid. */
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

/**
 * Reads raw string from storage by key with memory fallback.
 * @param {string} key
 * @returns {string|undefined}
 */
function readRaw(key) {
  if (STORAGE) {
    try {
      return STORAGE.getItem(key) ?? undefined;
    } catch {
      // ignore and fallback to memory
    }
  }
  return memoryStore[key];
}

/**
 * Writes raw string to storage by key with memory fallback.
 * @param {string} key
 * @param {string} value
 */
function writeRaw(key, value) {
  if (STORAGE) {
    try {
      STORAGE.setItem(key, value);
      return;
    } catch {
      // ignore and fallback to memory
    }
  }
  memoryStore[key] = value;
}

/**
 * PUBLIC_INTERFACE
 * getNotes
 * Load notes array from storage. Returns [] when missing or on error.
 * @returns {Array}
 */
export function getNotes() {
  /** Returns notes array from storage, defaulting to [] on errors. */
  const raw = readRaw(STORAGE_KEY);
  if (typeof raw !== 'string') return [];
  const parsed = safeParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Debounce timer state for setNotes writes.
 */
let pendingTimer = null;
let latestPayload = null;

/**
 * Subscribers that will be notified when a debounced save completes.
 * Each subscriber is a function receiving the saved notes.
 */
const saveSubscribers = new Set();

/**
 * Notify subscribers about a completed save.
 * @param {Array} notes
 */
function notifySaved(notes) {
  saveSubscribers.forEach((fn) => {
    try {
      fn(notes);
    } catch {
      // isolate subscriber errors
    }
  });
}

/**
 * PUBLIC_INTERFACE
 * subscribeToSaves
 * Subscribe to debounced save completions.
 * Returns an unsubscribe function.
 * @param {(notes:Array)=>void} fn
 * @returns {() => void}
 */
export function subscribeToSaves(fn) {
  /** Adds a listener to be called after the debounced save finishes. */
  if (typeof fn === 'function') {
    saveSubscribers.add(fn);
    return () => saveSubscribers.delete(fn);
  }
  return () => {};
}

/**
 * PUBLIC_INTERFACE
 * setNotes
 * Debounced save of notes to storage (300ms, last-write-wins).
 * @param {Array} notes
 */
export function setNotes(notes) {
  /** Debounced last-write-wins storage setter with 300ms delay. */
  latestPayload = Array.isArray(notes) ? notes : [];
  if (pendingTimer) {
    clearTimeout(pendingTimer);
  }
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    // Only persist the latest payload
    const toSave = Array.isArray(latestPayload) ? latestPayload : [];
    writeRaw(STORAGE_KEY, safeStringify(toSave, '[]'));
    notifySaved(toSave);
  }, 300);
}

/**
 * PUBLIC_INTERFACE
 * loadNotes
 * Alias for getNotes
 */
export const loadNotes = getNotes;

/**
 * PUBLIC_INTERFACE
 * saveNotes
 * Alias for setNotes
 */
export const saveNotes = setNotes;

export default {
  STORAGE_KEY,
  STORAGE,
  safeParse,
  safeStringify,
  getNotes,
  setNotes,
  loadNotes,
  saveNotes,
  subscribeToSaves,
};
