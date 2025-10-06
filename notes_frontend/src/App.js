import React from 'react';
import './App.css';

// PUBLIC_INTERFACE
function App() {
  /** Minimal shell for notes app; styles provided by Ocean Professional theme. */
  return (
    <div className="app">
      <aside className="sidebar surface">
        {/* Sidebar content will be implemented in subsequent tasks */}
      </aside>
      <main className="main">
        <div className="topbar">
          <div style={{ fontWeight: 700 }}>Notes</div>
          <div>
            <button className="btn">New Note</button>
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
