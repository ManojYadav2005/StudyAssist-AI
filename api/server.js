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

app.post('/api/completion', async (req, res) => {
  const { prompt, mode, existingDeck, refinementPrompt } = req.body;

  if (!prompt && !refinementPrompt) {
    return res.status(400).json({ error: 'Prompt or notes are required.' });
  }

  if (!AI_KEY || AI_KEY === 'your_api_key_here') {
    return res.status(500).json({
      error: 'AI_KEY is missing in your .env file.',
      hint: 'Please provide a valid Gemini API key in frontend/.env'
    });
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
      // Append key parameter if not already in URL
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
      // OpenAI / Groq / Ollama / OpenRouter compatible
      bodyPayload = {
        model: process.env.AI_MODEL || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: SYSTEM_SCHEMA_PROMPT },
          { role: 'user', content: fullPrompt }
        ],
        response_format: { type: 'json_object' }
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyPayload),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      let parsedErr = errText;
      try {
        parsedErr = JSON.parse(errText);
      } catch (_) {}

      return res.status(response.status).json({
        error: `AI provider error (${response.status})`,
        details: parsedErr
      });
    }

    const rawData = await response.json();
    let rawText = '';

    if (isGoogle) {
      rawText = rawData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      rawText = rawData?.choices?.[0]?.message?.content || '';
    }

    if (!rawText) {
      return res.status(502).json({
        error: 'AI returned an empty response.',
        raw: rawData
      });
    }

    // Extract and parse JSON
    const jsonStr = extractJsonString(rawText);
    let parsedObj;
    try {
      parsedObj = JSON.parse(jsonStr);
    } catch (parseErr) {
      return res.status(422).json({
        error: 'Model returned malformed JSON that could not be parsed.',
        rawText,
        parseError: parseErr.message
      });
    }

    // Validate and normalize schema
    try {
      const deck = normalizeStudyDeck(parsedObj);
      return res.json({
        success: true,
        data: deck
      });
    } catch (schemaErr) {
      return res.status(422).json({
        error: `Model returned invalid deck structure: ${schemaErr.message}`,
        rawText,
        rawParsed: parsedObj
      });
    }
  } catch (err) {
    console.error('Proxy completion error:', err);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Request timed out waiting for the AI model.' });
    }
    return res.status(500).json({
      error: 'Proxy server encountered an error processing the request.',
      message: err.message
    });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\x1b[32m✔ AI Proxy server running on http://localhost:${PORT}\x1b[0m`);
});
