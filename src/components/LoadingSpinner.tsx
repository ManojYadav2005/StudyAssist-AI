import React, { useState, useEffect } from 'react';

const LOADING_STEPS = [
  '⚡ Reading and analyzing your input notes...',
  '🧠 Extracting key definitions and core concepts...',
  '🗂️ Structuring high-yield flashcards...',
  '📝 Formulating multiple-choice quiz questions...',
  '✨ Validating JSON schema and building interactive deck...',
];

export default function LoadingSpinner() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="loading-card">
      <div className="spinner-halo">
        <div className="spinner-ring"></div>
        <span className="spinner-icon">⚡</span>
      </div>
      <h3 className="loading-title">Generating Your Study Deck</h3>
      <p className="loading-step-text">{LOADING_STEPS[stepIndex]}</p>
      <div className="loading-hint">This usually takes 2–6 seconds</div>
    </div>
  );
}
