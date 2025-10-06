import React from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import useLocalNotes from './hooks/useLocalNotes';

// PUBLIC_INTERFACE
function App() {
  /** Minimal shell for notes app; styles provided by Ocean Professional theme. */
  const {
    notes,
    filteredNotes,
    selectedNoteId,
    setSelectedNoteId,
    createNote,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
  } = useLocalNotes();

  return (
    <div className="app">
      <aside className="sidebar surface" style={{ padding: 0 }}>
        <Sidebar
          notes={filteredNotes}
          selectedNoteId={selectedNoteId}
          onSelect={setSelectedNoteId}
          onCreate={createNote}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortKey={sortBy}
          onSortChange={setSortBy}
        />
      </aside>
      <main className="main">
        <div className="topbar">
          <div style={{ fontWeight: 700 }}>Notes</div>
          <div>
            <button className="btn" onClick={createNote} aria-label="Create new note">
              New Note
            </button>
          </div>
        </div>
        <section className="content">
          <div className="surface elevated" style={{ padding: 16 }}>
            Select or create a note to get started.
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
