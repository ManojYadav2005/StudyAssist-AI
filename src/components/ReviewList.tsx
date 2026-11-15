import React from 'react';
import { Flashcard } from '../types';

interface ReviewListProps {
  cards: Flashcard[];
  reviewIds: Set<string>;
  onRemoveFromReview: (id: string) => void;
  onClearReview: () => void;
}

export default function ReviewList({
  cards,
  reviewIds,
  onRemoveFromReview,
  onClearReview,
}: ReviewListProps) {
  const flaggedCards = cards.filter((c) => reviewIds.has(c.id));

  if (flaggedCards.length === 0) {
    return (
      <div className="review-empty-card">
        <span className="review-empty-icon">🎉</span>
        <h3>No Cards Flagged for Review!</h3>
        <p>
          While flipping through flashcards, click <strong>"Flag for Review"</strong> on any concepts you want to study again later.
        </p>
      </div>
    );
  }

  return (
    <div className="review-container">
      <div className="review-top-header">
        <div>
          <h3>Flagged for Extra Review ({flaggedCards.length})</h3>
          <p className="review-sub">Master these challenging concepts before your test</p>
        </div>
        <button onClick={onClearReview} className="btn btn-secondary btn-sm">
          Clear All Flags
        </button>
      </div>

      <div className="review-cards-grid">
        {flaggedCards.map((card) => (
          <div key={card.id} className="review-card-item">
            <div className="review-card-header">
              <span className="review-badge">Review Focus</span>
              <button
                onClick={() => onRemoveFromReview(card.id)}
                className="btn-icon-sm"
                title="Mark as Mastered / Remove"
              >
                ✕
              </button>
            </div>
            <h4 className="review-q">{card.q}</h4>
            <p className="review-a">{card.a}</p>
            {card.hint && <div className="review-hint">💡 Hint: {card.hint}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
