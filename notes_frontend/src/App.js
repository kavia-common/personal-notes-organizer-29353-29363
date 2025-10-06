import React, { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import './App.css';
import './theme.css';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import Editor from './components/Editor';
import useLocalNotes from './hooks/useLocalNotes';
import { registerShortcuts } from './utils/shortcuts';

/**
 * PUBLIC_INTERFACE
 * App
 * Root component assembling the Notes application layout: Sidebar, Toolbar, and Editor.
 * - Uses useLocalNotes for localStorage-backed notes state.
 * - Supports hash-based deep links #/note/{id}.
 * - Provides loading and empty states with accessible labels.
 */
 // PUBLIC_INTERFACE
function App() {
  // Integrate notes state via custom hook
  const {
    notes,
    filteredNotes,
    selectedNoteId,
    setSelectedNoteId,
    selectedNote,
    createNote,
    updateNote,
    deleteNote,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    lastSavedAt,
  } = useLocalNotes();

  // Optional loading state (simple shimmer classnames are referenced via App.css)
  const [hydrated, setHydrated] = useState(false);
  // Refs to manage a11y-focused elements after actions
  const titleInputRef = useRef(null);
  const contentTextareaRef = useRef(null);

  useEffect(() => {
    // Mark as hydrated after first render tick
    const t = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(t);
  }, []);

  // Register global keyboard shortcuts (Cmd/Ctrl+N, Cmd/Ctrl+S)
  useEffect(() => {
    // Create a stable save handler referencing latest selectedNote
    const saveCurrentNote = () => {
      if (!selectedNoteId || !selectedNote) return;
      updateNote(selectedNoteId, {
        title: selectedNote.title,
        content: selectedNote.content,
      });
    };

    // After creating a new note, focus the title input if present, else content
    const getFocusTarget = () => titleInputRef.current || contentTextareaRef.current || null;

    const unsubscribe = registerShortcuts({
      onNew: () => {
        const id = createNote();
        if (typeof window !== 'undefined') {
          window.location.hash = `#/note/${encodeURIComponent(id)}`;
        }
      },
      onSave: saveCurrentNote,
      focusAfterNew: getFocusTarget(),
    });

    return () => {
      unsubscribe?.();
    };
  }, [createNote, selectedNote, selectedNoteId, updateNote]);

  // Hash-based routing helpers
  const selectByHash = useCallback(() => {
    const { hash } = window.location;
    const match = hash.match(/^#\/note\/(.+)$/);
    if (match && match[1]) {
      const id = decodeURIComponent(match[1]);
      // Only select if the note exists
      const exists = notes.some((n) => n.id === id);
      if (exists) {
        setSelectedNoteId(id);
      }
    }
  }, [notes, setSelectedNoteId]);

  // On mount and whenever notes list updates, try to sync selected note from hash
  useEffect(() => {
    selectByHash();
    const onHashChange = () => {
      selectByHash();
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [selectByHash]);

  // When selecting a note via UI, update the hash
  const handleSelectNote = useCallback(
    (id) => {
      setSelectedNoteId(id);
      if (typeof window !== 'undefined') {
        window.location.hash = `#/note/${encodeURIComponent(id)}`;
      }
    },
    [setSelectedNoteId]
  );

  // Create new note and deep link to it
  const handleCreateNote = useCallback(() => {
    const id = createNote();
    if (typeof window !== 'undefined') {
      window.location.hash = `#/note/${encodeURIComponent(id)}`;
    }
  }, [createNote]);

  // Save handler: in this local-storage app, updates are persisted automatically via the hook
  // but we expose an explicit save to bump updatedAt and trigger persistence.
  const handleSave = useCallback(() => {
    if (!selectedNoteId || !selectedNote) return;
    // NOP for content if unchanged; calling update ensures updatedAt refresh for a manual save intent
    updateNote(selectedNoteId, {
      title: selectedNote.title,
      content: selectedNote.content,
    });
  }, [selectedNoteId, selectedNote, updateNote]);

  const handleDelete = useCallback(() => {
    if (!selectedNoteId) return;
    deleteNote(selectedNoteId);
    // After delete, remove hash if no selected note
    setTimeout(() => {
      const stillSelected = window.location.hash.match(/^#\/note\/(.+)$/);
      if (stillSelected) {
        // remove hash; selection effect in hook will pick first if exists
        window.location.hash = '';
      }
    }, 0);
  }, [deleteNote, selectedNoteId]);

  const handleChangeTitle = useCallback(
    (nextTitle) => {
      if (!selectedNoteId) return;
      updateNote(selectedNoteId, { title: nextTitle });
    },
    [selectedNoteId, updateNote]
  );

  const handleChangeContent = useCallback(
    (nextContent) => {
      if (!selectedNoteId) return;
      updateNote(selectedNoteId, { content: nextContent });
    },
    [selectedNoteId, updateNote]
  );

  // Resolve focusable editor controls once the editor is rendered
  useEffect(() => {
    // Defer to next tick to ensure DOM nodes exist
    const t = setTimeout(() => {
      titleInputRef.current = document.getElementById('note-title');
      contentTextareaRef.current = document.getElementById('note-content');
    }, 0);
    return () => clearTimeout(t);
  }, [hasNote, selectedNoteId]);

  // Disabled states
  const hasNote = Boolean(selectedNoteId && selectedNote);
  const showEmpty = !hasNote && hydrated;
  const showLoading = !hydrated;

  // Derived toolbar saved timestamp
  const lastSaved = lastSavedAt;

  // Memoize props for Sidebar
  const sidebarNotes = useMemo(() => filteredNotes, [filteredNotes]);

  return (
    <div className="app">
      <aside className="sidebar surface" style={{ padding: 0 }}>
        <Sidebar
          notes={sidebarNotes}
          selectedNoteId={selectedNoteId}
          onSelect={handleSelectNote}
          onCreate={handleCreateNote}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortKey={sortBy}
          onSortChange={setSortBy}
        />
      </aside>

      <main className="main">
        <div className="topbar">
          <Toolbar
            onSave={handleSave}
            onDelete={handleDelete}
            hasNote={hasNote}
            lastSaved={lastSaved}
          />
          <div>
            <button
              className="btn"
              onClick={handleCreateNote}
              aria-label="Create new note"
              type="button"
            >
              New Note
            </button>
          </div>
        </div>

        <section className="content">
          {showLoading ? (
            <div className="surface elevated" style={{ padding: 16 }}>
              <div className="shimmer" aria-hidden="true">Loading…</div>
            </div>
          ) : (
            <Editor
              title={selectedNote?.title ?? ''}
              content={selectedNote?.content ?? ''}
              onChangeTitle={handleChangeTitle}
              onChangeContent={handleChangeContent}
              hasNote={hasNote}
            />
          )}

          {!hasNote && !showLoading ? (
            <div className="surface elevated" style={{ padding: 16, marginTop: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>No note selected</div>
              <div>Select a note from the sidebar or create a new one to begin.</div>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

export default App;
