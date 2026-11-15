import React from 'react';
import { SavedSession } from '../types';

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onNewDeck: () => void;
  savedSessions: SavedSession[];
  onLoadSession: (session: SavedSession) => void;
  hasActiveDeck: boolean;
}

export default function Header({
  darkMode,
  onToggleDarkMode,
  onNewDeck,
  savedSessions,
  onLoadSession,
  hasActiveDeck,
}: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-brand">
        <span className="brand-logo">⚡</span>
        <div>
          <h1 className="brand-title">StudyAssist AI</h1>
          <p className="brand-subtitle">Interactive Flashcards & Quiz Engine</p>
        </div>
      </div>

      <div className="header-actions">
        {savedSessions.length > 0 && (
          <div className="saved-decks-dropdown">
            <select
              aria-label="Load past session"
              onChange={(e) => {
                const found = savedSessions.find((s) => s.id === e.target.value);
                if (found) onLoadSession(found);
                e.target.value = '';
              }}
              defaultValue=""
              className="select-input"
            >
              <option value="" disabled>
                📂 Past Decks ({savedSessions.length})
              </option>
              {savedSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.deck.title.length > 28 ? s.deck.title.slice(0, 28) + '...' : s.deck.title} ({s.deck.cards.length} cards)
                </option>
              ))}
            </select>
          </div>
        )}

        {hasActiveDeck && (
          <button
            onClick={onNewDeck}
            className="btn btn-secondary btn-sm"
            title="Create a new deck"
          >
            ➕ New Deck
          </button>
        )}

        <button
          onClick={onToggleDarkMode}
          className="btn-icon"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}
