import React, { useState } from 'react';

interface RefinementBarProps {
  onRefine: (prompt: string) => void;
  loading: boolean;
}

const QUICK_ACTIONS = [
  '➕ Add 3 more advanced flashcards',
  '⚡ Make quiz questions harder',
  '🎯 Focus on key formulas & definitions',
  '📝 Add practical real-world scenarios',
];

export default function RefinementBar({ onRefine, loading }: RefinementBarProps) {
  const [refineText, setRefineText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (refineText.trim() && !loading) {
      onRefine(refineText.trim());
      setRefineText('');
    }
  };

  return (
    <div className="refinement-card">
      <div className="refinement-header">
        <span className="refinement-icon">🪄</span>
        <div>
          <h4 className="refinement-title">Refine This Study Deck</h4>
          <p className="refinement-subtitle">
            Provide follow-up prompts to edit or extend your current deck without restarting.
          </p>
        </div>
      </div>

      <div className="quick-actions-list">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action}
            type="button"
            className="quick-action-pill"
            onClick={() => onRefine(action)}
            disabled={loading}
          >
            {action}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="refinement-form">
        <input
          type="text"
          className="text-input refinement-input"
          placeholder="e.g. Add 2 more questions on lifecycle hooks or simplify card explanations..."
          value={refineText}
          onChange={(e) => setRefineText(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className="btn btn-secondary"
          disabled={!refineText.trim() || loading}
        >
          {loading ? 'Refining...' : 'Apply Edit'}
        </button>
      </form>
    </div>
  );
}
