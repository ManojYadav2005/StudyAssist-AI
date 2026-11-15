export interface Flashcard {
  id: string;
  q: string;
  a: string;
  hint?: string;
  mastered?: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface StudyDeck {
  title: string;
  summary: string;
  cards: Flashcard[];
  quiz: QuizQuestion[];
  createdAt?: string;
}

export interface SavedSession {
  id: string;
  timestamp: number;
  deck: StudyDeck;
}

export type ViewMode = 'cards' | 'quiz' | 'review';
