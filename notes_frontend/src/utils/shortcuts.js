//
// Keyboard shortcuts utility for the Notes app
//

/**
 * PUBLIC_INTERFACE
 * registerShortcuts
 * Registers global keyboard shortcuts for:
 * - Cmd/Ctrl+N: Create a new note
 * - Cmd/Ctrl+S: Save current note (prevents default browser "Save Page")
 *
 * Returns an unsubscribe function to remove the listeners.
 *
 * @param {object} opts
 * @param {function} opts.onNew - Called when user presses Cmd/Ctrl+N
 * @param {function} opts.onSave - Called when user presses Cmd/Ctrl+S
 * @param {HTMLElement} [opts.focusAfterNew] - Optional element to focus after creating a new note (for a11y)
 * @returns {() => void} unsubscribe function
 */
// PUBLIC_INTERFACE
export function registerShortcuts({ onNew, onSave, focusAfterNew } = {}) {
  /**
   * Keydown handler that listens for meta/ctrl combos and triggers callbacks.
   * It prevents default browser "Save Page" for Cmd/Ctrl+S.
   * It is conservative in editable contexts to avoid breaking native input behaviors.
   */
  const handler = (e) => {
    // Only act on meta/ctrl combos
    const isModifier = e.metaKey || e.ctrlKey;
    if (!isModifier) return;

    const key = String(e.key || '').toLowerCase();

    // Avoid interfering with browser/system shortcuts when focus is inside content-editable or input areas,
    // except for Cmd/Ctrl+S which is expected to save.
    const target = e.target;
    const tag = (target?.tagName || '').toLowerCase();
    const isInputField =
      tag === 'input' || tag === 'textarea' || target?.isContentEditable;

    if (key === 's') {
      // Prevent browser's Save Page dialog
      e.preventDefault();
      try {
        onSave?.();
      } catch {
        // isolate shortcut errors
      }
      return;
    }

    if (key === 'n') {
      // Allow creating new note even from inputs; does not need preventDefault unless it conflicts.
      // Some browsers might type literal 'n' into inputs on Ctrl+N - avoid this by preventing default when inside inputs.
      if (isInputField) {
        e.preventDefault();
      }
      try {
        onNew?.();
      } catch {
        // isolate shortcut errors
      }
      // Optional focus management to keep workflow efficient and accessible
      if (focusAfterNew && typeof focusAfterNew.focus === 'function') {
        // Delay focus to next microtask so UI updates (like routing or state changes) occur first
        setTimeout(() => {
          try {
            focusAfterNew.focus();
          } catch {
            // ignore focus errors
          }
        }, 0);
      }
      return;
    }
  };

  document.addEventListener('keydown', handler);

  // Return cleanup
  return function unregisterShortcuts() {
    document.removeEventListener('keydown', handler);
  };
}

export default {
  registerShortcuts,
};
