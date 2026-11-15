import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import InputBox from './components/InputBox';
import Flashcards from './components/Flashcards';
import QuizView from './components/QuizView';
import ReviewList from './components/ReviewList';
import RefinementBar from './components/RefinementBar';
import ErrorBanner from './components/ErrorBanner';
import LoadingSpinner from './components/LoadingSpinner';
import { useAiResponse } from './hooks/useAiResponse';
import { StudyDeck, SavedSession, ViewMode } from './types';

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [reviewList, setReviewList] = useState<Set<string>>(new Set());

  // Saved decks in localStorage
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>(() => {
    try {
      const saved = localStorage.getItem('ai_study_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const {
    data: activeDeck,
    error,
    rawErrorDetails,
    loading,
    generate,
    refine,
    retry,
    setDeck,
  } = useAiResponse('/api/completion');

  // Load last active deck on initial mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem('ai_study_active_deck');
      if (cached && !activeDeck) {
        setDeck(JSON.parse(cached));
      }
    } catch (_) {}
  }, []);

  // Save active deck to localStorage
  useEffect(() => {
    if (activeDeck) {
      localStorage.setItem('ai_study_active_deck', JSON.stringify(activeDeck));

      // Also add to saved sessions if new
      setSavedSessions((prev) => {
        const exists = prev.some((s) => s.deck.title === activeDeck.title);
        if (exists) return prev;
        const newSession: SavedSession = {
          id: `session-${Date.now()}`,
          timestamp: Date.now(),
          deck: activeDeck,
        };
        const updated = [newSession, ...prev].slice(0, 10);
        localStorage.setItem('ai_study_sessions', JSON.stringify(updated));
        return updated;
      });
    }
  }, [activeDeck]);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleToggleReviewCard = (cardId: string) => {
    setReviewList((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const handleClearReview = () => {
    setReviewList(new Set());
  };

  const handleLoadSession = (session: SavedSession) => {
    setDeck(session.deck);
    setViewMode('cards');
  };

  const handleNewDeck = () => {
    setDeck(null);
    localStorage.removeItem('ai_study_active_deck');
    setViewMode('cards');
  };

  return (
    <div className="app-layout">
      <Header
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        onNewDeck={handleNewDeck}
        savedSessions={savedSessions}
        onLoadSession={handleLoadSession}
        hasActiveDeck={!!activeDeck}
      />

      <main className="main-content">
        {/* Error notification banner */}
        {error && (
          <ErrorBanner
            message={error}
            rawDetails={rawErrorDetails}
            onRetry={retry}
            onLoadFallback={(demoDeck) => setDeck(demoDeck)}
          />
        )}

        {/* Input box shown when no deck exists or when user chooses to replace */}
        {!activeDeck && !loading && (
          <div className="hero-section">
            <div className="hero-text">
              <span className="hero-badge">AI Knowledge Synthesizer</span>
              <h2 className="hero-title">Turn Notes into Interactive Study Tools</h2>
              <p className="hero-subtitle">
                Paste any notes, text, or lecture topic. Our AI transforms it into 3D interactive flashcards and a self-grading quiz with error-correction review.
              </p>
            </div>
            <InputBox onSubmit={generate} loading={loading} />
          </div>
        )}

        {/* Loading state */}
        {loading && <LoadingSpinner />}

        {/* Active Deck View */}
        {activeDeck && !loading && (
          <div className="deck-workspace">
            {/* Deck Header */}
            <div className="deck-header-card">
              <div className="deck-meta">
                <span className="deck-type-tag">Study Deck</span>
                <h2 className="deck-title">{activeDeck.title}</h2>
                <p className="deck-summary">{activeDeck.summary}</p>
              </div>

              {/* View Switcher Tabs */}
              <nav className="mode-tabs">
                <button
                  className={`tab-btn ${viewMode === 'cards' ? 'tab-active' : ''}`}
                  onClick={() => setViewMode('cards')}
                >
                  🗂️ Flashcards ({activeDeck.cards.length})
                </button>
                <button
                  className={`tab-btn ${viewMode === 'quiz' ? 'tab-active' : ''}`}
                  onClick={() => setViewMode('quiz')}
                >
                  📝 Quiz Mode ({activeDeck.quiz.length})
                </button>
                <button
                  className={`tab-btn ${viewMode === 'review' ? 'tab-active' : ''}`}
                  onClick={() => setViewMode('review')}
                >
                  🎯 Review Flags ({reviewList.size})
                </button>
              </nav>
            </div>

            {/* Mode Content */}
            <div className="mode-content-stage">
              {viewMode === 'cards' && (
                <Flashcards
                  cards={activeDeck.cards}
                  onToggleReviewCard={handleToggleReviewCard}
                  reviewList={reviewList}
                />
              )}

              {viewMode === 'quiz' && (
                <QuizView quiz={activeDeck.quiz} />
              )}

              {viewMode === 'review' && (
                <ReviewList
                  cards={activeDeck.cards}
                  reviewIds={reviewList}
                  onRemoveFromReview={handleToggleReviewCard}
                  onClearReview={handleClearReview}
                />
              )}
            </div>

            {/* Stretch Goal: Refinement Loop */}
            <RefinementBar
              onRefine={(prompt) => refine(prompt, activeDeck)}
              loading={loading}
            />
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Built with React + Vite • Structured JSON parsing & error resilience • Gemini AI Engine</p>
      </footer>
    </div>
  );
}
