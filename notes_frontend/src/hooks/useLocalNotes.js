import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getNotes as storageGetNotes,
  setNotes as storageSetNotes,
  subscribeToSaves,
  safeParse,
} from '../utils/storage';

/**
 * INTERNALS
 */
const STORAGE_KEY = 'notes.v1';
const DEFAULT_TITLE = 'Untitled';
const SAVE_DEBOUNCE_MS = 300;

// Generate unique IDs combining timestamp and random segment
function genId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * PUBLIC_INTERFACE
 * useLocalNotes
 * React hook to manage notes with debounced persistence to local storage.
 * Returns state, CRUD actions, search/sort controls, filtered notes, and last-saved timestamp.
 */
// PUBLIC_INTERFACE
export default function useLocalNotes() {
  /** Manages notes lifecycle with debounced persistence and helpers. */

  // State
  const [notes, setNotes] = useState(() => {
    // Load initial notes via storage.getNotes('notes.v1')
    try {
      // storageGetNotes already reads from the fixed key; call directly
      const initial = storageGetNotes(STORAGE_KEY);
      return Array.isArray(initial) ? initial : [];
    } catch (e) {
      // If parsing fails or any error, fall back to [] and warn once
      console.warn?.('[useLocalNotes] Failed to load notes; resetting to empty.', e);
      return [];
    }
  });
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt'); // 'updatedAt' | 'title'
  const [lastSavedAt, setLastSavedAt] = useState(null);

  // Internal concurrency guard and timers
  const isSavingRef = useRef(false);
  const saveTimerRef = useRef(null);
  const warnedLoadRef = useRef(false);

  // Ensure selectedNoteId is valid when notes change (e.g., after delete or initial load)
  useEffect(() => {
    if (!selectedNoteId) {
      if (notes.length > 0) {
        setSelectedNoteId((prev) => prev ?? notes[0]?.id ?? null);
      }
      return;
    }
    const exists = notes.some((n) => n.id === selectedNoteId);
    if (!exists) {
      setSelectedNoteId(notes[0]?.id ?? null);
    }
  }, [notes, selectedNoteId]);

  // Subscribe to storage debounced save completion; if not available, fallback to internal timer.
  useEffect(() => {
    // When notes changes, trigger storage.setNotes with debounce.
    // Use a simple guard to avoid concurrent writes
    if (isSavingRef.current) {
      // let the last debounced write finish; the storage's debounce will coalesce writes
    }
    isSavingRef.current = true;
    storageSetNotes(notes);

    // Setup a fallback timer to update lastSavedAt after expected debounce delay
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      // If no subscriber fired, this ensures we still update lastSavedAt
      setLastSavedAt(Date.now());
      isSavingRef.current = false;
      saveTimerRef.current = null;
    }, SAVE_DEBOUNCE_MS + 20); // small buffer beyond debounce

    // Subscribe to actual saved event if available
    const unsubscribe = subscribeToSaves((savedNotes) => {
      // Only mark save when the saved payload appears to match latest reference type
      // Update lastSavedAt to now as save completed
      setLastSavedAt(Date.now());
      isSavingRef.current = false;
      // Clear the fallback timer as we have an actual event
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    });

    return () => {
      unsubscribe?.();
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [notes]);

  // Derived selectedNote
  const selectedNote = useMemo(() => {
    if (!selectedNoteId) return null;
    return notes.find((n) => n.id === selectedNoteId) || null;
  }, [notes, selectedNoteId]);

  // CRUD operations
  const createNote = useCallback(() => {
    const now = Date.now();
    const newNote = {
      id: genId(),
      title: DEFAULT_TITLE,
      content: '',
      createdAt: now,
      updatedAt: now,
    };
    setNotes((prev) => {
      const next = [newNote, ...prev];
      return next;
    });
    setSelectedNoteId(newNote.id);
    return newNote.id;
  }, []);

  const updateNote = useCallback((id, fields = {}) => {
    setNotes((prev) => {
      let changed = false;
      const next = prev.map((n) => {
        if (n.id !== id) return n;
        const updates = {};
        if (Object.prototype.hasOwnProperty.call(fields, 'title')) {
          updates.title = typeof fields.title === 'string' ? fields.title : n.title;
        }
        if (Object.prototype.hasOwnProperty.call(fields, 'content')) {
          updates.content = typeof fields.content === 'string' ? fields.content : n.content;
        }
        const hasFieldChange =
          (updates.title !== undefined && updates.title !== n.title) ||
          (updates.content !== undefined && updates.content !== n.content);

        if (hasFieldChange) {
          changed = true;
          return {
            ...n,
            ...updates,
            updatedAt: Date.now(),
          };
        }
        return n;
      });
      return changed ? next : prev;
    });
  }, []);

  const deleteNote = useCallback((id) => {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      return next;
    });
    // selection fix handled by effect on [notes, selectedNoteId]
  }, []);

  // Search and sort helpers
  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = notes;

    if (q) {
      list = notes.filter((n) => {
        const title = (n.title || '').toLowerCase();
        const content = (n.content || '').toLowerCase();
        return title.includes(q) || content.includes(q);
      });
    }

    const sorter =
      sortBy === 'title'
        ? (a, b) => (a.title || '').localeCompare(b.title || '')
        : (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0);

    return [...list].sort(sorter);
  }, [notes, searchQuery, sortBy]);

  // On mount, attempt to parse storage raw safely with a one-time warning only if failure
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage?.getItem(STORAGE_KEY) : null;
      if (raw) {
        const parsed = safeParse(raw, '__INVALID__');
        if (parsed === '__INVALID__' && !warnedLoadRef.current) {
          console.warn?.('[useLocalNotes] Invalid stored JSON for notes; resetting to empty.');
          warnedLoadRef.current = true;
        }
      }
    } catch {
      // ignore - already handled by storage utils with memory fallback
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    notes,
    selectedNoteId,
    selectedNote,
    setSelectedNoteId,
    createNote,
    updateNote,
    deleteNote,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    filteredNotes,
    lastSavedAt,
  };
}
