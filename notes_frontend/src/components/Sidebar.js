import React, { useMemo } from 'react';
import './Sidebar.css';

/**
 * Utilities
 */
function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

// PUBLIC_INTERFACE
export default function Sidebar({
  /** Array of note objects: { id, title, content, updatedAt } */
  notes = [],
  /** Currently selected note id (string|null) */
  selectedNoteId = null,
  /** Callback when a note is selected; receives id */
  onSelect,
  /** Callback to create a new note */
  onCreate,
  /** Current search query string */
  searchQuery = '',
  /** Called with next search string value */
  onSearchChange,
  /** Sort key: 'updatedAt' | 'title' */
  sortKey = 'updatedAt',
  /** Called with next sort key */
  onSortChange,
}) {
  /** Sidebar listing with search/sort controls and create action. Keyboard-accessible listbox. */

  const hasResults = Array.isArray(notes) && notes.length > 0;

  const headerTitle = 'Notes';

  // For accessibility - compute active index for aria-activedescendant if needed
  const activeIndex = useMemo(() => {
    if (!hasResults || !selectedNoteId) return -1;
    return notes.findIndex((n) => n.id === selectedNoteId);
  }, [notes, hasResults, selectedNoteId]);

  const onKeyDownList = (e) => {
    if (!hasResults) return;
    const currentIndex = activeIndex >= 0 ? activeIndex : 0;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = Math.min(notes.length - 1, currentIndex + 1);
      const next = notes[nextIndex];
      if (next && onSelect) onSelect(next.id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = Math.max(0, currentIndex - 1);
      const prev = notes[prevIndex];
      if (prev && onSelect) onSelect(prev.id);
    } else if (e.key === 'Home') {
      e.preventDefault();
      const first = notes[0];
      if (first && onSelect) onSelect(first.id);
    } else if (e.key === 'End') {
      e.preventDefault();
      const last = notes[notes.length - 1];
      if (last && onSelect) onSelect(last.id);
    } else if (e.key === 'Enter' || e.key === ' ') {
      // No-op: selection happens on focus movement already; prevent scroll on space
      e.preventDefault();
    }
  };

  return (
    <aside className="Sidebar surface" aria-label="Notes sidebar">
      <div className="Sidebar__header bg-gradient">
        <div className="Sidebar__brand" aria-label="Application title">
          {headerTitle}
        </div>
        <div className="Sidebar__actions">
          <button
            className="btn Sidebar__newBtn"
            aria-label="Create new note"
            onClick={onCreate}
            type="button"
          >
            New Note
          </button>
        </div>
      </div>

      <div className="Sidebar__controls">
        <label className="visually-hidden" htmlFor="sidebar-search">
          Search notes
        </label>
        <input
          id="sidebar-search"
          className="input Sidebar__search"
          aria-label="Search notes"
          type="search"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
        />

        <label className="visually-hidden" htmlFor="sidebar-sort">
          Sort notes
        </label>
        <select
          id="sidebar-sort"
          className="input Sidebar__sort"
          aria-label="Sort notes"
          value={sortKey}
          onChange={(e) => onSortChange?.(e.target.value)}
        >
          <option value="updatedAt">Recently updated</option>
          <option value="title">Title (A–Z)</option>
        </select>
      </div>

      <div className="Sidebar__listWrapper">
        {!hasResults ? (
          <div className="Sidebar__empty">
            <div className="Sidebar__emptyTitle">No notes yet</div>
            <div className="Sidebar__emptyDesc">Create your first note to get started.</div>
          </div>
        ) : (
          <ul
            className="Sidebar__list"
            role="listbox"
            aria-label="Notes list"
            tabIndex={0}
            onKeyDown={onKeyDownList}
            aria-activedescendant={
              activeIndex >= 0 ? `note-option-${notes[activeIndex]?.id}` : undefined
            }
          >
            {notes.map((note) => {
              const isActive = note.id === selectedNoteId;
              const title = (note.title || '').trim() || 'Untitled';
              const content = (note.content || '').replace(/\s+/g, ' ').trim();
              const snippet = content.length > 0 ? content.slice(0, 80) : 'No content';
              const time = formatRelativeTime(note.updatedAt);
              return (
                <li
                  key={note.id}
                  id={`note-option-${note.id}`}
                  role="option"
                  aria-selected={isActive}
                  className={`Sidebar__item ${isActive ? 'is-active' : ''}`}
                >
                  <button
                    type="button"
                    className="Sidebar__itemBtn"
                    onClick={() => onSelect?.(note.id)}
                    aria-label={`Open note: ${title}`}
                  >
                    <div className="Sidebar__itemHeader">
                      <div className="Sidebar__itemTitle">{title}</div>
                      {time ? <div className="Sidebar__itemTime">{time}</div> : null}
                    </div>
                    <div className="Sidebar__itemSnippet" title={content}>
                      {snippet}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
