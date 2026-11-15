import React, { useState } from 'react';
import { StudyDeck } from '../types';

interface ErrorBannerProps {
  message: string;
  rawDetails?: any;
  onRetry?: () => void;
  onLoadFallback?: (deck: StudyDeck) => void;
}

const SAMPLE_DEMO_DECK: StudyDeck = {
  title: 'React Hooks & State Management (Offline Demo)',
  summary: 'Core concepts of modern React functional components, hooks lifecycle, and state reactivity.',
  cards: [
    {
      id: 'demo-1',
      q: 'What is the purpose of useEffect dependency array, and what happens if omitted?',
      a: 'The dependency array tells React when to re-run the effect. If omitted, the effect runs after every render. If empty [], it runs once on mount. If populated [a, b], it runs only when dependencies change.',
      hint: 'Think about render triggers.'
    },
    {
      id: 'demo-2',
      q: 'Why should you never call Hooks inside loops, conditions, or nested functions?',
      a: 'React relies on the call order of Hooks across re-renders to preserve state. Calling them conditionally breaks the deterministic call order and causes state corruption.',
      hint: 'Rules of Hooks.'
    },
    {
      id: 'demo-3',
      q: 'What is the difference between useCallback and useMemo?',
      a: 'useCallback(fn, deps) caches a function definition between renders. useMemo(() => fn(), deps) caches the calculated return value of a function.',
      hint: 'Function vs. Value.'
    },
    {
      id: 'demo-4',
      q: 'How does useRef differ from useState in React?',
      a: 'Updating a ref (.current = value) is mutable and does NOT trigger a re-render. useState is immutable and schedules a component re-render when the setter is called.',
      hint: 'Render triggers and mutability.'
    }
  ],
  quiz: [
    {
      id: 'quiz-demo-1',
      question: 'Which hook should you use to preserve a mutable value across renders without causing a re-render?',
      options: ['useState', 'useRef', 'useMemo', 'useReducer'],
      correctIndex: 1,
      explanation: 'useRef returns a persistent object with a .current property that can be mutated without scheduling a component re-render.'
    },
    {
      id: 'quiz-demo-2',
      question: 'What happens when you pass an empty dependency array [] to useEffect?',
      options: [
        'The effect runs after every single render',
        'The effect runs only once when the component mounts',
        'The effect is disabled and never runs',
        'React throws a compile-time warning'
      ],
      correctIndex: 1,
      explanation: 'Passing [] signifies the effect has zero reactive dependencies, executing once on initial mount.'
    },
    {
      id: 'quiz-demo-3',
      question: 'What is the primary purpose of React.memo?',
      options: [
        'To prevent component re-renders if props have not changed',
        'To memoize heavy calculations inside a render loop',
        'To store global application state',
        'To trigger asynchronous data fetching'
      ],
      correctIndex: 0,
      explanation: 'React.memo is a higher-order component that memoizes the rendered output, skipping re-renders when props remain shallowly equal.'
    }
  ]
};

export default function ErrorBanner({
  message,
  rawDetails,
  onRetry,
  onLoadFallback,
}: ErrorBannerProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="error-banner-card">
      <div className="error-main-row">
        <span className="error-badge-icon">⚠️</span>
        <div className="error-content-body">
          <h4 className="error-heading">AI Generation Error</h4>
          <p className="error-message-text">{message}</p>
        </div>
      </div>

      <div className="error-actions-row">
        {onRetry && (
          <button onClick={onRetry} className="btn btn-primary btn-sm">
            🔄 Retry Request
          </button>
        )}

        {onLoadFallback && (
          <button
            onClick={() => onLoadFallback(SAMPLE_DEMO_DECK)}
            className="btn btn-secondary btn-sm"
          >
            🧪 Load Sample Demo Deck
          </button>
        )}

        {rawDetails && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="btn btn-ghost btn-sm"
          >
            {showDetails ? 'Hide Details ▲' : 'Inspect AI Output ▼'}
          </button>
        )}
      </div>

      {showDetails && rawDetails && (
        <div className="error-debug-drawer">
          <div className="debug-drawer-header">Raw Model Output / Diagnostic Data:</div>
          <pre className="debug-code-box">
            {typeof rawDetails === 'string'
              ? rawDetails
              : JSON.stringify(rawDetails, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
