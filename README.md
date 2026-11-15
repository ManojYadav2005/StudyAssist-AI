# ⚡ StudyAssist AI — Interactive Flashcards & Quiz Engine

> **Frontend Internship Assignment**  
> A production-ready React application that takes free-form notes or topics, prompts a real LLM for structured JSON, and transforms unpredictable AI output into a stateful, interactive, and resilient study tool.

---

## 🚀 Quick Setup & Run

### Prerequisites
- Node.js (v18+ recommended)
- A Gemini API Key ([Get one free in Google AI Studio](https://aistudio.google.com/app/apikey))

### One-Command Run
```bash
# 1. Clone the repository & navigate into frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Create .env file with your API key
cp .env.example .env
# Edit .env and paste your GEMINI API Key:
# AI_KEY=your_gemini_api_key_here

# 4. Start both Frontend (Vite) and AI Proxy (Express)
npm start
```

The app will launch at:
- **Frontend UI:** `http://localhost:3000` (or `http://localhost:3001` if port 3000 is occupied)
- **AI Proxy Backend:** `http://localhost:4000`

---

## 🎯 Chosen Project: Study Assistant

Based on user lecture notes, text clippings, or topic prompts, the AI generates a structured study deck containing:
1. **Interactive 3D Flashcards:**
   - 3D perspective flip card animation (Front: Question + optional Hint, Back: Explanation).
   - Full keyboard navigation: `Space` / `Enter` to flip, `←` `→` arrow keys to navigate.
   - Shuffle deck capability.
   - "Flag for Review" tagging system to separate difficult cards.
2. **Self-Grading Quiz Mode:**
   - Multiple-choice questions with instant visual feedback (green/red highlights).
   - Detailed conceptual explanation cards.
   - End-of-quiz score breakdown and percentage gauge.
   - **🎯 "Re-Test Wrong Answers" Mode:** Re-filters the quiz dynamically down to only the questions answered incorrectly, allowing users to practice until 100% mastery.
3. **Flagged Cards Review Desk:**
   - A dedicated tab showing all cards flagged during study sessions to focus on weak spots.
4. **Refinement Loop (Stretch Goal):**
   - Follow-up prompt input allowing users to modify the current deck (e.g. *"Add 3 more advanced questions"*, *"Make quiz harder"*).
5. **Session History & Persistence (Stretch Goal):**
   - Automatically saves generated decks to `localStorage`. Past study sessions can be reloaded at any time via the header dropdown.
6. **Dark / Light Mode (Stretch Goal):**
   - System-responsive theme with manual toggle, styled with CSS custom properties.

---

## 🛡️ Handling Bad AI Output (Core Evaluation Signal)

AI outputs are inherently non-deterministic. Here is how this application ensures **zero crashes** and a rock-solid user experience:

### 1. Stale Response Protection & Race Condition Guard
- **The Problem:** If a user submits a prompt, quickly edits it, and submits a second prompt, the first (slower) request might resolve *after* the second request and overwrite the newer UI state.
- **The Solution:** A monotonic `requestId` ref counter is incremented on every dispatch in `useAiResponse`. Before state updates occur, the hook verifies `currentRequestId === latestRequestIdRef.current`. Stale responses are discarded immediately. Additionally, previous in-flight HTTP requests are aborted using `AbortController`.

### 2. Markdown Fence Stripping & Outer Object Extraction
- **The Problem:** LLMs often wrap JSON inside ````json ... ```` fences or prepend conversational pleasantries like *"Sure, here is your study deck:"*.
- **The Solution:** The backend proxy executes an extraction pipeline:
  ```js
  // 1. Strip markdown code fences if present
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  // 2. Extract substring between first '{' and last '}'
  const cleaned = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
  ```

### 3. Schema Normalization & Key Variation Repair
- **The Problem:** Models occasionally hallucinate alternative key names (e.g., `flashcards` instead of `cards`, `front` / `back` instead of `q` / `a`).
- **The Solution:** A resilient normalization layer in `api/server.js` standardizes variations into consistent TypeScript interfaces (`StudyDeck`, `Flashcard`, `QuizQuestion`), ensuring invalid null fields are replaced with safe defaults rather than throwing runtime exceptions.

### 4. Client-Side Timeouts & Slow-Response Handling
- **The Problem:** AI model APIs may stall, hang, or queue requests during peak hours.
- **The Solution:** Both backend and frontend enforce explicit timeout thresholds (22 seconds). If exceeded, requests abort cleanly and prompt the user with a friendly retry action.

### 5. Transparent Error Diagnostics & Offline Demo Fallback
- **The Problem:** If an API key is invalid, quota is exceeded, or unparseable text is returned, the user should never see a blank screen or a cryptic console crash.
- **The Solution:**
  - An **Error Banner** describes the root cause in plain English.
  - An expandable **"Inspect AI Output"** panel lets evaluators view the exact raw text or error payload returned by the model.
  - A **"🧪 Load Sample Demo Deck"** button is built in so the entire interactive UI can be explored even without an active API key or internet access.

---

## 🏗️ Architecture & Project Structure

```
frontend/
├── api/
│   └── server.js             # Express proxy (protects API key, Gemini REST integration, JSON repair)
├── scripts/
│   └── start.js              # One-command runner (launches Vite + Express concurrently)
├── src/
│   ├── components/
│   │   ├── Header.tsx        # Brand, dark mode toggle, session loader
│   │   ├── InputBox.tsx      # Free-form input, sample topic chips, character counter
│   │   ├── Flashcards.tsx    # 3D perspective flip card, shuffle, review flagging, keyboard nav
│   │   ├── QuizView.tsx      # Multiple choice test, explanation reveals, re-test wrong answers
│   │   ├── ReviewList.tsx    # Filtered cards flagged for targeted revision
│   │   ├── RefinementBar.tsx # Follow-up prompt bar for incremental edits
│   │   ├── ErrorBanner.tsx   # User-friendly error card + debug inspector + demo deck loader
│   │   └── LoadingSpinner.tsx# Animated step-by-step progress indicator
│   ├── hooks/
│   │   └── useAiResponse.ts  # Stale response protection, AbortController, timeout, retry
│   ├── types.ts              # TypeScript interfaces for decks, cards, quiz, sessions
│   ├── App.tsx               # Main layout, view routing, localStorage synchronization
│   ├── main.tsx              # React entry point
│   └── index.css             # Semantic design system, light/dark themes, 3D flip animations
├── index.html                # Vite HTML entry point
├── package.json              # Scripts and dependencies
└── vite.config.ts            # Vite proxy config (/api -> http://localhost:4000)
```

---

## 🤖 AI Usage Note

In accordance with assignment guidelines:
- **LLM in Production:** Google Gemini 1.5 Flash (`generativelanguage.googleapis.com`) via backend proxy.
- **AI Coding Assistance:** Claude / Gemini / Cursor were used for architectural brainstorming, CSS 3D perspective transition tuning, and edge-case testing for JSON repair routines.
- Every line of code, hook lifecycle, and security decision is fully understood and will be walked through during the technical interview.

---

## ⏱️ Time Spent

- **Scaffolding & Architecture:** ~1 hour (Vite setup, Express proxy, TypeScript types, `index.html`).
- **AI Integration & Error Handling:** ~2.5 hours (Gemini REST headers, JSON parser, stale request cancellation, error diagnostic UI).
- **Interactive UI & Polish:** ~2.5 hours (3D flashcard flip animation, Quiz engine, Re-Test Wrong Answers mode, dark mode).
- **Refinement Loop & Testing:** ~1 hour (Prompt chaining, edge cases, responsive layout).
- **Documentation & Verification:** ~0.5 hours.
- **Total Time:** ~7.5 hours (within the 8-hour target).

---

## 🔮 Known Limitations & What I'd Do Next

1. **Streaming Partial Flashcards:** Stream SSE chunks from Gemini to render cards progressively as they are generated.
2. **Audio Pronunciation:** Integrate Web Speech API (`speechSynthesis`) for language flashcards.
3. **Spaced Repetition System (SRS):** Implement the SuperMemo-2 (SM-2) algorithm for optimal interval review.
4. **Export Options:** Add export to Anki (`.apkg`) and Quizlet formats.
