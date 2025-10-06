import React from 'react';
import './Editor.css';

/**
 * PUBLIC_INTERFACE
 * Editor
 * A controlled editor component for notes with a title input and a multiline content textarea.
 * Renders an empty-state panel when no note is selected.
 * 
 * Props:
 * - title: string (controlled) - note title value
 * - content: string (controlled) - note content value
 * - onChangeTitle: function(nextTitle: string) - called when title changes
 * - onChangeContent: function(nextContent: string) - called when content changes
 * - placeholder: string - text to show in empty state when no note is selected
 * - hasNote: boolean - if false, empty-state is rendered
 */
// PUBLIC_INTERFACE
export default function Editor({
  title = '',
  content = '',
  onChangeTitle,
  onChangeContent,
  placeholder = 'Select or create a note to get started.',
  hasNote = true,
}) {
  /** Renders either the empty-state or the editor fields. */

  if (!hasNote) {
    return (
      <div className="Editor Editor--empty surface elevated" role="region" aria-label="Editor empty state">
        <div className="Editor__emptyTitle">No note selected</div>
        <div className="Editor__emptyDesc">{placeholder}</div>
      </div>
    );
  }

  const handleTitleInput = (e) => {
    onChangeTitle?.(e.target.value);
  };

  const handleContentInput = (e) => {
    onChangeContent?.(e.target.value);
  };

  return (
    <div className="Editor surface elevated" role="region" aria-label="Note editor">
      <div className="Editor__header">
        <label htmlFor="note-title" className="visually-hidden">
          Note title
        </label>
        <input
          id="note-title"
          className="input Editor__title"
          aria-label="Note title"
          placeholder="Untitled"
          value={title}
          onInput={handleTitleInput}
          onChange={() => {}}
          type="text"
          autoComplete="off"
        />
      </div>

      <div className="Editor__body">
        <label htmlFor="note-content" className="visually-hidden">
          Note content
        </label>
        <textarea
          id="note-content"
          className="Editor__content"
          aria-label="Note content"
          placeholder="Start typing your note..."
          value={content}
          onInput={handleContentInput}
          onChange={() => {}}
          rows={14}
        />
      </div>
    </div>
  );
}
