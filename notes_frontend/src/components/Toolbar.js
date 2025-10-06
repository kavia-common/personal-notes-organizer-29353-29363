import React, { useMemo } from 'react';
import './Toolbar.css';

/**
 * Utilities
 */
function formatRelativeTime(lastSaved) {
  if (!lastSaved) return '';
  const diff = Date.now() - lastSaved;
  const s = Math.floor(diff / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/**
 * PUBLIC_INTERFACE
 * Toolbar
 * Renders a note toolbar with Save and Delete actions, last-saved indicator,
 * and an optional theme toggle. Accessible and keyboard-friendly.
 */
// PUBLIC_INTERFACE
export default function Toolbar({
  /** Called when Save is clicked */
  onSave,
  /** Called when Delete is clicked */
  onDelete,
  /** Whether there is a current note context */
  hasNote = false,
  /** Timestamp (ms) when last saved, or null */
  lastSaved = null,
  /** Optional theme toggler (called to toggle theme) */
  onToggleTheme,
  /** Optional current theme name 'light' | 'dark' or any string */
  currentTheme,
}) {
  const lastSavedLabel = useMemo(() => {
    if (!lastSaved) return 'Not saved yet';
    const rel = formatRelativeTime(lastSaved);
    return rel === 'just now' ? 'Saved just now' : `Saved ${rel}`;
  }, [lastSaved]);

  const handleSave = (e) => {
    e?.preventDefault?.();
    onSave?.();
  };

  const handleDelete = (e) => {
    e?.preventDefault?.();
    if (!hasNote) return;
    onDelete?.();
  };

  const showThemeToggle = typeof onToggleTheme === 'function';

  return (
    <div className="Toolbar surface elevated" role="toolbar" aria-label="Note actions toolbar">
      <div className="Toolbar__left">
        <button
          type="button"
          className="btn Toolbar__saveBtn"
          aria-label="Save note"
          onClick={handleSave}
        >
          Save
        </button>

        <button
          type="button"
          className="btn Toolbar__deleteBtn"
          aria-label="Delete note"
          onClick={handleDelete}
          disabled={!hasNote}
          aria-disabled={!hasNote}
        >
          Delete
        </button>

        <div
          className="Toolbar__savedStatus"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          title={lastSaved ? new Date(lastSaved).toLocaleString() : undefined}
        >
          {lastSavedLabel}
        </div>
      </div>

      <div className="Toolbar__right">
        {showThemeToggle ? (
          <button
            type="button"
            className="icon-btn Toolbar__themeToggle"
            aria-label={`Toggle theme${currentTheme ? `, current ${currentTheme}` : ''}`}
            onClick={onToggleTheme}
            title="Toggle theme"
          >
            {/* Simple theme icon using emoji to keep dependencies minimal */}
            <span aria-hidden="true" className="Toolbar__themeIcon">
              {currentTheme === 'dark' ? '🌙' : '☀️'}
            </span>
            <span className="Toolbar__themeText">
              {currentTheme === 'dark' ? 'Dark' : 'Light'}
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
