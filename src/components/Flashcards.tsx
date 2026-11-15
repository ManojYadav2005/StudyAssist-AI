import React, { useState, useEffect } from 'react';
import { Flashcard } from '../types';

interface FlashcardsProps {
  cards: Flashcard[];
  onToggleReviewCard: (cardId: string) => void;
  reviewList: Set<string>;
}

export default function Flashcards({
  cards,
  onToggleReviewCard,
  reviewList,
}: FlashcardsProps) {
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>(cards);

  useEffect(() => {
    setShuffledCards(cards);
    setIndex(0);
    setIsFlipped(false);
    setShowHint(false);
  }, [cards]);

  const currentCard = shuffledCards[index];

  const handleNext = () => {
    setIsFlipped(false);
    setShowHint(false);
    setIndex((prev) => (prev + 1) % shuffledCards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setShowHint(false);
    setIndex((prev) => (prev - 1 + shuffledCards.length) % shuffledCards.length);
  };

  const handleFlip = () => {
    setIsFlipped((prev) => !prev);
  };

  const handleShuffle = () => {
    const copy = [...shuffledCards];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    setShuffledCards(copy);
    setIndex(0);
    setIsFlipped(false);
    setShowHint(false);
  };

  // Keyboard navigation: Space/Enter = flip, ArrowLeft = prev, ArrowRight = next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        handleFlip();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shuffledCards.length, index]);

  if (!currentCard) {
    return <div className="empty-state">No cards available.</div>;
  }

  const isFlaggedForReview = reviewList.has(currentCard.id);

  return (
    <div className="flashcards-container">
      <div className="flashcards-top-bar">
        <div className="card-counter">
          Card <span className="counter-current">{index + 1}</span> of{' '}
          <span className="counter-total">{shuffledCards.length}</span>
        </div>

        <div className="flashcards-actions-bar">
          <button
            onClick={() => onToggleReviewCard(currentCard.id)}
            className={`btn-tag ${isFlaggedForReview ? 'tag-flagged' : ''}`}
            title="Flag this card for extra review"
          >
            {isFlaggedForReview ? '🚩 In Review List' : '🏳️ Flag for Review'}
          </button>

          <button
            onClick={handleShuffle}
            className="btn btn-secondary btn-xs"
            title="Shuffle cards"
          >
            🔀 Shuffle
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: `${((index + 1) / shuffledCards.length) * 100}%` }}
        />
      </div>

      {/* 3D Flip Card */}
      <div className="card-stage" onClick={handleFlip} role="button" tabIndex={0}>
        <div className={`card-inner ${isFlipped ? 'flipped' : ''}`}>
          {/* Front */}
          <div className="card-face card-front">
            <span className="card-side-label">QUESTION</span>
            <div className="card-content-body">
              <p className="card-question-text">{currentCard.q}</p>
            </div>
            {currentCard.hint && (
              <div
                className="card-hint-box"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHint(!showHint);
                }}
              >
                <span className="hint-toggle">
                  💡 {showHint ? currentCard.hint : 'Click to view hint'}
                </span>
              </div>
            )}
            <div className="card-footer-tip">Click or press Space to flip</div>
          </div>

          {/* Back */}
          <div className="card-face card-back">
            <span className="card-side-label answer-label">ANSWER</span>
            <div className="card-content-body">
              <p className="card-answer-text">{currentCard.a}</p>
            </div>
            <div className="card-footer-tip">Click or press Space to flip back</div>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flashcards-controls">
        <button
          onClick={handlePrev}
          className="btn btn-secondary nav-btn"
          title="Previous Card (Left Arrow)"
        >
          ⬅️ Previous
        </button>

        <button
          onClick={handleFlip}
          className="btn btn-primary flip-btn"
        >
          {isFlipped ? '🔄 Show Question' : '🔄 Reveal Answer'}
        </button>

        <button
          onClick={handleNext}
          className="btn btn-secondary nav-btn"
          title="Next Card (Right Arrow)"
        >
          Next ➡️
        </button>
      </div>

      <p className="keyboard-shortcuts-hint">
        Tip: Use <kbd>←</kbd> <kbd>→</kbd> arrows to navigate, and <kbd>Space</kbd> to flip.
      </p>
    </div>
  );
}
