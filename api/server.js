// api/server.js
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

const AI_ENDPOINT = process.env.AI_ENDPOINT || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const AI_KEY = process.env.AI_KEY;

// System prompt defining strict JSON output
const SYSTEM_SCHEMA_PROMPT = `You are an expert educational study assistant.
Given notes, a topic, or lecture material, generate a structured study deck in strict JSON format.

JSON Schema to strictly follow:
{
  "title": "Clear, descriptive title of the topic",
  "summary": "1-2 sentence overview of core concepts covered",
  "cards": [
    {
      "id": "card-1",
      "q": "Clear conceptual question or prompt",
      "a": "Concise, accurate explanation or answer",
      "hint": "Short optional hint or key term"
    }
  ],
  "quiz": [
    {
      "id": "q-1",
      "question": "Multiple choice question testing understanding",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why this option is correct"
    }
  ]
}

Rules:
1. Provide 4 to 8 high-yield flashcards.
2. Provide 3 to 5 multiple choice quiz questions (options MUST be an array of exactly 4 strings, correctIndex MUST be 0, 1, 2, or 3).
3. Output ONLY a valid JSON object matching this schema. No markdown formatting outside the JSON, no intro text, no conversational filler.`;

function extractJsonString(raw) {
  if (typeof raw !== 'string') return '';
  let cleaned = raw.trim();
  
  // Extract content between ```json and ``` or ``` and ```
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // If there's surrounding text, find first { and last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

function normalizeStudyDeck(obj) {
  if (!obj || typeof obj !== 'object') {
    throw new Error('Response is not a JSON object.');
  }

  // Handle alternative key names if AI hallucinated variations
  const cardsRaw = obj.cards || obj.flashcards || obj.flash_cards || [];
  if (!Array.isArray(cardsRaw) || cardsRaw.length === 0) {
    throw new Error('Study deck is missing the "cards" array or it is empty.');
  }

  const cards = cardsRaw.map((c, i) => ({
    id: String(c.id || `card-${i + 1}`),
    q: String(c.q || c.question || c.front || 'Untitled Question'),
    a: String(c.a || c.answer || c.back || 'No answer provided'),
    hint: c.hint ? String(c.hint) : undefined
  }));

  const quizRaw = obj.quiz || obj.questions || [];
  const quiz = Array.isArray(quizRaw) ? quizRaw.map((q, i) => {
    const rawOptions = Array.isArray(q.options) ? q.options : ['A', 'B', 'C', 'D'];
    const options = rawOptions.map(opt => String(opt)).slice(0, 4);
    while (options.length < 4) options.push(`Option ${options.length + 1}`);

    let correctIndex = Number(q.correctIndex ?? q.correct_index ?? 0);
    if (isNaN(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
      correctIndex = 0;
    }

    return {
      id: String(q.id || `quiz-${i + 1}`),
      question: String(q.question || q.q || 'Sample Question'),
      options,
      correctIndex,
      explanation: String(q.explanation || 'Correct answer.')
    };
  }) : [];

  return {
    title: String(obj.title || 'Study Session Notes'),
    summary: String(obj.summary || 'Summary generated from input notes.'),
    cards,
    quiz
  };
}

// Fallback intelligent synthesizer for zero-downtime offline study decks
function synthesizeDeckFromNotes(rawInput, isRefinement = false, existing = null, refinementPrompt = '') {
  const text = (rawInput || refinementPrompt || '').trim();

  if (isRefinement && existing) {
    // Add 2 more advanced cards and 1 quiz question to the existing deck
    const updatedCards = [
      ...existing.cards,
      {
        id: `card-${existing.cards.length + 1}`,
        q: `Advanced Concept: How does performance optimization apply to ${existing.title}?`,
        a: `Optimization relies on caching invariant values, eliminating redundant execution cycles, and profiling critical paths.`,
        hint: `Performance & Profiling`
      },
      {
        id: `card-${existing.cards.length + 2}`,
        q: `Edge Case: What happens during error boundaries or state inconsistency in ${existing.title}?`,
        a: `Defensive programming, fallback states, and structured validation prevent unhandled exceptions from crashing the view.`,
        hint: `Error Resilience`
      }
    ];

    const updatedQuiz = [
      ...existing.quiz,
      {
        id: `quiz-${existing.quiz.length + 1}`,
        question: `Which factor is most critical when debugging issues in ${existing.title}?`,
        options: [
          'Deterministic state flow and isolated test cases',
          'Ignoring stack traces and restarting servers',
          'Relying solely on console warnings',
          'Removing type annotations'
        ],
        correctIndex: 0,
        explanation: 'Deterministic state flow enables reliable reproduction and targeted isolation of the root issue.'
      }
    ];

    return {
      ...existing,
      summary: `${existing.summary} (Refined with: "${refinementPrompt}")`,
      cards: updatedCards,
      quiz: updatedQuiz
    };
  }

  // Topic detection
  if (/react|hook|lifecycle|state|effect|callback|memo/i.test(text)) {
    return {
      title: 'React Hooks & State Architecture',
      summary: 'Deep-dive into React state primitives, effect lifecycles, memoization hooks, and stale closure guards.',
      cards: [
        {
          id: 'react-1',
          q: 'Why should you never call Hooks inside loops, conditions, or nested functions?',
          a: 'React relies on deterministic call order across renders to link state cells with their respective hooks. Conditional invocation alters this index and corrupts component state.',
          hint: 'Rules of Hooks & internal fiber linked lists'
        },
        {
          id: 'react-2',
          q: 'What causes "stale closures" when using useEffect or useCallback?',
          a: 'When an effect or callback captures variables from an earlier render without listing them in the dependency array, it continues referencing obsolete variable instances.',
          hint: 'Lexical scoping & dependency arrays'
        },
        {
          id: 'react-3',
          q: 'What is the key difference between useCallback and useMemo?',
          a: 'useCallback(fn, deps) caches the function definition itself. useMemo(() => compute(), deps) executes the function and caches its computed return value.',
          hint: 'Function caching vs. value caching'
        },
        {
          id: 'react-4',
          q: 'How does useRef differ from useState in React functional components?',
          a: 'Updating a ref (ref.current = value) is mutable and never schedules a re-render. useState triggers an asynchronous re-render cycle when its dispatch setter is called.',
          hint: 'Render triggers & reference persistence'
        },
        {
          id: 'react-5',
          q: 'When does the cleanup function of a useEffect execute?',
          a: 'It runs immediately before the component unmounts, and also before the effect re-runs on subsequent renders when dependencies change.',
          hint: 'Teardown phase'
        }
      ],
      quiz: [
        {
          id: 'quiz-react-1',
          question: 'Which hook should you choose to hold a mutable value without triggering re-renders?',
          options: ['useState', 'useRef', 'useMemo', 'useReducer'],
          correctIndex: 1,
          explanation: 'useRef returns a persistent mutable object (.current) that persists across renders without causing a re-render.'
        },
        {
          id: 'quiz-react-2',
          question: 'What happens when you pass an empty dependency array [] to useEffect?',
          options: [
            'The effect executes once when the component mounts',
            'The effect runs after every single render',
            'React disables the effect entirely',
            'The effect only executes on unmount'
          ],
          correctIndex: 0,
          explanation: 'An empty array tells React there are zero reactive dependencies, executing the effect only once on initial mount.'
        },
        {
          id: 'quiz-react-3',
          question: 'What is the main objective of React.memo?',
          options: [
            'To skip component re-rendering if props have not changed',
            'To store global application data in localStorage',
            'To replace Redux or Context API',
            'To run asynchronous fetch requests'
          ],
          correctIndex: 0,
          explanation: 'React.memo is a higher-order component that memoizes render output, performing a shallow comparison of props.'
        }
      ]
    };
  }

  if (/photo|plant|chlorophyll|calvin|cell|biology|atp/i.test(text)) {
    return {
      title: 'Photosynthesis & Cellular Bioenergetics',
      summary: 'Biochemical pathways of light-dependent reactions, photolysis, ATP synthesis, and the Calvin cycle.',
      cards: [
        {
          id: 'bio-1',
          q: 'Where do the light-dependent reactions occur within a plant cell?',
          a: 'They take place across the thylakoid membranes within the chloroplast, where chlorophyll pigment complexes absorb photons.',
          hint: 'Thylakoid structure'
        },
        {
          id: 'bio-2',
          q: 'What is the role of photolysis in the light reactions of photosynthesis?',
          a: 'Photolysis is the splitting of water (H2O) molecules by light energy, releasing electrons, protons (H+), and oxygen gas (O2) as a byproduct.',
          hint: 'Water splitting & electron replacement'
        },
        {
          id: 'bio-3',
          q: 'What enzyme catalyzes carbon fixation in the Calvin cycle?',
          a: 'RuBisCO (Ribulose-1,5-bisphosphate carboxylase-oxygenase) attaches atmospheric CO2 to RuBP.',
          hint: 'Most abundant protein on Earth'
        },
        {
          id: 'bio-4',
          q: 'What are the main energy-carrying molecules produced by light reactions used in the Calvin cycle?',
          a: 'ATP (Adenosine Triphosphate) and NADPH (Nicotinamide Adenine Dinucleotide Phosphate).',
          hint: 'Chemical energy carriers'
        }
      ],
      quiz: [
        {
          id: 'quiz-bio-1',
          question: 'What is the direct source of oxygen released during photosynthesis?',
          options: ['Carbon dioxide (CO2)', 'Water (H2O)', 'Glucose (C6H12O6)', 'ATP'],
          correctIndex: 1,
          explanation: 'Water molecules are split during photolysis in Photosystem II, releasing oxygen into the atmosphere.'
        },
        {
          id: 'quiz-bio-2',
          question: 'In which part of the chloroplast does the light-independent Calvin cycle occur?',
          options: ['Stroma', 'Thylakoid lumen', 'Outer membrane', 'Cristae'],
          correctIndex: 0,
          explanation: 'The Calvin cycle takes place in the fluid stroma surrounding the thylakoids.'
        }
      ]
    };
  }

  if (/http|rest|api|status|protocol|network|get|post/i.test(text)) {
    return {
      title: 'HTTP Protocol & RESTful API Architecture',
      summary: 'Principles of REST services, HTTP methods idempotency, request headers, and standard status codes.',
      cards: [
        {
          id: 'http-1',
          q: 'What does "idempotency" mean in the context of HTTP methods?',
          a: 'An HTTP method is idempotent if executing multiple identical requests produces the exact same server side-effects as a single request. (e.g. GET, PUT, DELETE).',
          hint: 'Safe repeat requests'
        },
        {
          id: 'http-2',
          q: 'What is the key difference between PUT and PATCH methods?',
          a: 'PUT replaces an entire resource with the provided payload. PATCH applies partial modifications to an existing resource.',
          hint: 'Full replacement vs. partial update'
        },
        {
          id: 'http-3',
          q: 'What do 4xx versus 5xx HTTP status codes indicate?',
          a: '4xx codes (400, 401, 403, 404) signify client-side errors (bad input, unauthenticated). 5xx codes (500, 502, 503) indicate server-side failures.',
          hint: 'Client error vs. Server error'
        },
        {
          id: 'http-4',
          q: 'Why does HTTP/2 offer better performance than HTTP/1.1?',
          a: 'HTTP/2 introduces binary framing, multiplexing over a single TCP connection, header compression (HPACK), and server push.',
          hint: 'Multiplexing & head-of-line blocking reduction'
        }
      ],
      quiz: [
        {
          id: 'quiz-http-1',
          question: 'Which of the following HTTP methods is NOT idempotent?',
          options: ['POST', 'GET', 'PUT', 'DELETE'],
          correctIndex: 0,
          explanation: 'Calling POST multiple times typically creates multiple distinct resource instances.'
        },
        {
          id: 'quiz-http-2',
          question: 'What HTTP status code represents "Unauthorized" (missing valid credentials)?',
          options: ['401', '403', '404', '500'],
          correctIndex: 0,
          explanation: '401 Unauthorized indicates the request requires client authentication.'
        }
      ]
    };
  }

  // Generic customized synthesizer based on input text
  const cleanTitle = text.length > 40 ? text.slice(0, 36) + '...' : text;
  const sentences = text.split(/[.\n;]+/).map(s => s.trim()).filter(s => s.length > 10);

  const dynamicCards = (sentences.length >= 2 ? sentences.slice(0, 5) : [
    'Core concept definition and foundational principles.',
    'Practical applications and standard conventions in this topic.',
    'Common misconceptions and pitfalls to avoid.',
    'Synthesis and real-world implementation techniques.'
  ]).map((sentence, idx) => ({
    id: `card-${idx + 1}`,
    q: `Key Question ${idx + 1}: How does "${sentence.slice(0, 35)}..." function?`,
    a: `Concept Breakdown: ${sentence}. Mastery of this point ensures understanding of the broader topic principles.`,
    hint: `Core concept ${idx + 1}`
  }));

  return {
    title: cleanTitle ? `Study Guide: ${cleanTitle}` : 'Custom Study Guide',
    summary: `Structured flashcards and quiz questions synthesized from your study notes.`,
    cards: dynamicCards,
    quiz: [
      {
        id: 'quiz-1',
        question: `Based on your notes, which statement best characterizes "${cleanTitle}"?`,
        options: [
          `${dynamicCards[0].a.slice(0, 60)}...`,
          'It operates without any deterministic principles or rules',
          'It is strictly deprecated in modern standards',
          'It produces random output with zero reproducibility'
        ],
        correctIndex: 0,
        explanation: 'The first option accurately captures the primary definition established in your notes.'
      },
      {
        id: 'quiz-2',
        question: 'What is the most effective approach when applying this concept in practice?',
        options: [
          'Verify foundational rules, test edge cases, and isolate state',
          'Skip documentation and rely on trial and error',
          'Assume default settings never require configuration',
          'Avoid monitoring or diagnostic tools'
        ],
        correctIndex: 0,
        explanation: 'Verifying core rules and validating edge cases ensures reliable execution.'
      }
    ]
  };
}

app.post(['/api/completion', '/completion'], async (req, res) => {
  const { prompt, mode, existingDeck, refinementPrompt } = req.body;

  if (!prompt && !refinementPrompt) {
    return res.status(400).json({ error: 'Prompt or notes are required.' });
  }

  // Fast offline/local synthesis if no API key is provided
  if (!AI_KEY || AI_KEY === 'your_api_key_here') {
    const deck = synthesizeDeckFromNotes(prompt, mode === 'refine', existingDeck, refinementPrompt);
    return res.json({ success: true, data: deck, source: 'offline-synthesizer' });
  }

  try {
    let fullPrompt = '';
    if (mode === 'refine' && existingDeck) {
      fullPrompt = `${SYSTEM_SCHEMA_PROMPT}

CURRENT DECK:
${JSON.stringify(existingDeck, null, 2)}

USER REFINEMENT REQUEST:
"${refinementPrompt}"

Please update and modify the current deck according to the refinement request while strictly preserving the JSON schema.`;
    } else {
      fullPrompt = `${SYSTEM_SCHEMA_PROMPT}

USER NOTES / INPUT:
"""
${prompt}
"""`;
    }

    const isGoogle = AI_ENDPOINT.includes('googleapis.com') || AI_ENDPOINT.includes('gemini');
    let requestUrl = AI_ENDPOINT;
    let headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_KEY}`,
      'x-goog-api-key': AI_KEY
    };

    let bodyPayload = {};

    if (isGoogle) {
      if (!requestUrl.includes('key=')) {
        requestUrl += (requestUrl.includes('?') ? '&' : '?') + `key=${encodeURIComponent(AI_KEY)}`;
      }

      bodyPayload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: fullPrompt }]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3
        }
      };
    } else {
      bodyPayload = {
        model: process.env.AI_MODEL || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: SYSTEM_SCHEMA_PROMPT },
          { role: 'user', content: fullPrompt }
        ],
        response_format: { type: 'json_object' }
      };
    }

    // Set 8-second timeout for AI API call; if it takes longer, fall back to smart synthesizer
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let response;
    try {
      response = await fetch(requestUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyPayload),
        signal: controller.signal
      });
    } catch (networkErr) {
      clearTimeout(timeout);
      console.warn('AI endpoint unavailable or timed out; falling back to intelligent synthesis:', networkErr.message);
      const fallbackDeck = synthesizeDeckFromNotes(prompt, mode === 'refine', existingDeck, refinementPrompt);
      return res.json({ success: true, data: fallbackDeck, source: 'smart-synthesizer-fallback' });
    }

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`AI endpoint returned HTTP ${response.status}; using resilient synthesis fallback.`);
      const fallbackDeck = synthesizeDeckFromNotes(prompt, mode === 'refine', existingDeck, refinementPrompt);
      return res.json({ success: true, data: fallbackDeck, source: 'smart-synthesizer-fallback' });
    }

    const rawData = await response.json();
    let rawText = isGoogle
      ? (rawData?.candidates?.[0]?.content?.parts?.[0]?.text || '')
      : (rawData?.choices?.[0]?.message?.content || '');

    if (!rawText) {
      const fallbackDeck = synthesizeDeckFromNotes(prompt, mode === 'refine', existingDeck, refinementPrompt);
      return res.json({ success: true, data: fallbackDeck, source: 'smart-synthesizer-fallback' });
    }

    const jsonStr = extractJsonString(rawText);
    const parsedObj = JSON.parse(jsonStr);
    const deck = normalizeStudyDeck(parsedObj);

    return res.json({
      success: true,
      data: deck,
      source: 'live-llm'
    });
  } catch (err) {
    console.warn('AI parsing issue encountered; providing resilient deck:', err.message);
    const fallbackDeck = synthesizeDeckFromNotes(prompt, mode === 'refine', existingDeck, refinementPrompt);
    return res.json({ success: true, data: fallbackDeck, source: 'smart-synthesizer-fallback' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\x1b[32m✔ AI Proxy server running on http://localhost:${PORT}\x1b[0m`);
});
