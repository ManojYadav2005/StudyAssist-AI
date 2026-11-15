import React, { useState } from 'react';

interface InputBoxProps {
  onSubmit: (text: string) => void;
  loading: boolean;
}

const SAMPLE_PROMPTS = [
  {
    label: '⚛️ React Hooks',
    text: 'Explain React useState, useEffect, useCallback, useMemo, and useRef. Include why closures cause stale state and how dependency arrays work.',
  },
  {
    label: '🌱 Photosynthesis',
    text: 'Photosynthesis light-dependent and light-independent Calvin cycle reactions, chlorophyll absorption spectrum, ATP synthase, and electron transport chain.',
  },
  {
    label: '🌐 HTTP & REST',
    text: 'Key differences between HTTP 1.1, HTTP/2, and HTTP/3. Explain idempotency in GET, POST, PUT, DELETE, and PATCH methods with status codes 200, 201, 400, 401, 403, 404, 500.',
  },
];

export default function InputBox({ onSubmit, loading }: InputBoxProps) {
  const [text, setText] = useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (text.trim() && !loading) {
      onSubmit(text.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="input-card">
      <form onSubmit={handleSubmit}>
        <div className="input-header">
          <label htmlFor="notes-input" className="input-label">
            Paste Notes, Text, or a Topic to Study:
          </label>
          <span className="character-count">{text.length} characters</span>
        </div>

        <textarea
          id="notes-input"
          className="text-input"
          rows={5}
          placeholder="e.g. Paste lecture notes, bullet points, article snippets, or type a topic..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />

        <div className="input-footer">
          <div className="sample-chips">
            <span className="sample-label">Try sample:</span>
            {SAMPLE_PROMPTS.map((sample) => (
              <button
                type="button"
                key={sample.label}
                className="chip-btn"
                onClick={() => setText(sample.text)}
                disabled={loading}
              >
                {sample.label}
              </button>
            ))}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={!text.trim() || loading}
          >
            {loading ? (
              <>
                <span className="btn-spinner"></span> Generating...
              </>
            ) : (
              '⚡ Generate Study Deck'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
