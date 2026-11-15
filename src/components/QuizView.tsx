import React, { useState } from 'react';
import { QuizQuestion } from '../types';

interface QuizViewProps {
  quiz: QuizQuestion[];
  onRetestWrong?: (wrongQuestions: QuizQuestion[]) => void;
}

export default function QuizView({ quiz, onRetestWrong }: QuizViewProps) {
  const [currentQuestions, setCurrentQuestions] = useState<QuizQuestion[]>(quiz);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answersMap, setAnswersMap] = useState<Record<string, number>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [isRetestMode, setIsRetestMode] = useState(false);

  const currentQ = currentQuestions[currentIndex];

  const handleSelectOption = (idx: number) => {
    if (selectedOption !== null) return; // prevent changing answer after submission
    setSelectedOption(idx);
    setAnswersMap((prev) => ({
      ...prev,
      [currentQ.id]: idx,
    }));
  };

  const handleNext = () => {
    if (currentIndex + 1 < currentQuestions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
    } else {
      setIsCompleted(true);
    }
  };

  const handleRestartFullQuiz = () => {
    setCurrentQuestions(quiz);
    setCurrentIndex(0);
    setSelectedOption(null);
    setAnswersMap({});
    setIsCompleted(false);
    setIsRetestMode(false);
  };

  // Compute results
  const correctCount = currentQuestions.filter(
    (q) => answersMap[q.id] === q.correctIndex
  ).length;

  const wrongQuestions = currentQuestions.filter(
    (q) => answersMap[q.id] !== undefined && answersMap[q.id] !== q.correctIndex
  );

  const handleStartRetest = () => {
    if (wrongQuestions.length === 0) return;
    setCurrentQuestions(wrongQuestions);
    setCurrentIndex(0);
    setSelectedOption(null);
    setAnswersMap({});
    setIsCompleted(false);
    setIsRetestMode(true);
  };

  if (!quiz || quiz.length === 0) {
    return (
      <div className="empty-state">
        <p>No quiz questions generated for this topic.</p>
      </div>
    );
  }

  // Quiz Results Screen
  if (isCompleted) {
    const scorePercent = Math.round((correctCount / currentQuestions.length) * 100);
    const isPerfect = scorePercent === 100;

    return (
      <div className="quiz-results-card">
        <div className="results-header">
          <span className="results-badge">{isPerfect ? '🎉 Perfect Score!' : '📊 Quiz Completed'}</span>
          <h2 className="results-title">
            {isRetestMode ? 'Re-Test Complete!' : 'Your Quiz Results'}
          </h2>
          <div className="score-circle">
            <span className="score-number">{scorePercent}%</span>
            <span className="score-sub">
              {correctCount} / {currentQuestions.length} correct
            </span>
          </div>
        </div>

        {wrongQuestions.length > 0 ? (
          <div className="wrong-review-section">
            <h3 className="wrong-header-title">
              ⚠️ Questions to Review ({wrongQuestions.length})
            </h3>
            <div className="wrong-questions-list">
              {wrongQuestions.map((wq) => (
                <div key={wq.id} className="wrong-item-box">
                  <p className="wrong-item-q">❓ {wq.question}</p>
                  <p className="wrong-item-correct">
                    ✅ <strong>Correct:</strong> {wq.options[wq.correctIndex]}
                  </p>
                  <p className="wrong-item-exp">💡 {wq.explanation}</p>
                </div>
              ))}
            </div>

            <div className="results-actions">
              <button onClick={handleStartRetest} className="btn btn-primary btn-lg">
                🎯 Re-Test Wrong Answers ({wrongQuestions.length})
              </button>
              <button onClick={handleRestartFullQuiz} className="btn btn-secondary">
                🔄 Retake Entire Quiz
              </button>
            </div>
          </div>
        ) : (
          <div className="perfect-feedback-box">
            <p>🌟 Outstanding work! You answered every question correctly.</p>
            <div className="results-actions">
              <button onClick={handleRestartFullQuiz} className="btn btn-secondary">
                🔄 Retake Quiz
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const hasAnswered = selectedOption !== null;
  const isSelectedCorrect = hasAnswered && selectedOption === currentQ.correctIndex;

  return (
    <div className="quiz-container">
      {isRetestMode && (
        <div className="retest-banner">
          <span>🎯 Retest Mode: Reviewing {currentQuestions.length} previously missed questions</span>
        </div>
      )}

      {/* Quiz Progress */}
      <div className="quiz-header">
        <div className="quiz-counter">
          Question <span className="counter-current">{currentIndex + 1}</span> of{' '}
          <span className="counter-total">{currentQuestions.length}</span>
        </div>
        <span className="quiz-score-pill">
          Score: {correctCount} / {currentIndex + (hasAnswered ? 1 : 0)}
        </span>
      </div>

      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: `${((currentIndex + 1) / currentQuestions.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="quiz-question-box">
        <h3 className="quiz-question-text">{currentQ.question}</h3>

        <div className="quiz-options-list">
          {currentQ.options.map((option, idx) => {
            let optionClass = 'quiz-option-btn';
            if (hasAnswered) {
              if (idx === currentQ.correctIndex) {
                optionClass += ' option-correct';
              } else if (idx === selectedOption) {
                optionClass += ' option-incorrect';
              } else {
                optionClass += ' option-dimmed';
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(idx)}
                className={optionClass}
                disabled={hasAnswered}
              >
                <span className="option-letter">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="option-text">{option}</span>
                {hasAnswered && idx === currentQ.correctIndex && (
                  <span className="option-icon">✓</span>
                )}
                {hasAnswered && idx === selectedOption && idx !== currentQ.correctIndex && (
                  <span className="option-icon">✗</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback & Explanation Card */}
        {hasAnswered && (
          <div className={`quiz-feedback-box ${isSelectedCorrect ? 'feedback-correct' : 'feedback-incorrect'}`}>
            <div className="feedback-status">
              {isSelectedCorrect ? '🎉 Correct!' : '❌ Incorrect'}
            </div>
            <p className="feedback-explanation">
              <strong>Explanation:</strong> {currentQ.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="quiz-footer">
        <button
          onClick={handleNext}
          className="btn btn-primary"
          disabled={!hasAnswered}
        >
          {currentIndex + 1 === currentQuestions.length ? 'View Results 🏁' : 'Next Question ➡️'}
        </button>
      </div>
    </div>
  );
}
