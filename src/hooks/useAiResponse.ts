import { useState, useCallback, useRef } from 'react';
import { StudyDeck } from '../types';

export interface UseAiResponseState {
  data: StudyDeck | null;
  error: string | null;
  rawErrorDetails: any | null;
  loading: boolean;
  isStale: boolean;
  lastPrompt: string;
}

export function useAiResponse(endpoint: string = '/api/completion') {
  const [state, setState] = useState<UseAiResponseState>({
    data: null,
    error: null,
    rawErrorDetails: null,
    loading: false,
    isStale: false,
    lastPrompt: '',
  });

  // Track the latest request ID to prevent stale responses from overwriting newer ones
  const latestRequestIdRef = useRef<number>(0);
  const activeControllerRef = useRef<AbortController | null>(null);

  const executeRequest = useCallback(
    async (
      payload: {
        prompt?: string;
        mode?: 'generate' | 'refine';
        existingDeck?: StudyDeck;
        refinementPrompt?: string;
      }
    ) => {
      // Abort any ongoing in-flight request
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }

      const controller = new AbortController();
      activeControllerRef.current = controller;

      // Increment request ID
      const currentRequestId = ++latestRequestIdRef.current;

      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        rawErrorDetails: null,
        lastPrompt: payload.prompt || payload.refinementPrompt || prev.lastPrompt,
      }));

      // Set a client-side timeout of 22 seconds
      const timeoutId = setTimeout(() => {
        if (latestRequestIdRef.current === currentRequestId) {
          controller.abort();
        }
      }, 22000);

      try {
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Check for stale response
        if (latestRequestIdRef.current !== currentRequestId) {
          console.warn(`[useAiResponse] Stale response discarded (Request #${currentRequestId} vs Latest #${latestRequestIdRef.current})`);
          return;
        }

        const json = await resp.json();

        if (!resp.ok || !json.success) {
          const errMsg = json.error || `HTTP error ${resp.status}: Request failed`;
          setState((prev) => ({
            ...prev,
            loading: false,
            error: errMsg,
            rawErrorDetails: json.details || json.rawText || json,
          }));
          return;
        }

        const deck = json.data as StudyDeck;

        // Extra client-side structural validation
        if (!deck || !Array.isArray(deck.cards) || deck.cards.length === 0) {
          throw new Error('Received invalid study deck: no flashcards were generated.');
        }

        setState((prev) => ({
          ...prev,
          data: deck,
          error: null,
          rawErrorDetails: null,
          loading: false,
          isStale: false,
          lastPrompt: payload.prompt || prev.lastPrompt,
        }));
      } catch (err: any) {
        clearTimeout(timeoutId);

        // If stale or explicitly cancelled, don't update state
        if (latestRequestIdRef.current !== currentRequestId) {
          return;
        }

        let userFriendlyError = err.message || 'An unexpected error occurred.';
        if (err.name === 'AbortError') {
          userFriendlyError = 'Request timed out or was cancelled. The model is taking longer than usual. Please retry.';
        }

        setState((prev) => ({
          ...prev,
          loading: false,
          error: userFriendlyError,
          rawErrorDetails: err.stack || err,
        }));
      } finally {
        if (activeControllerRef.current === controller) {
          activeControllerRef.current = null;
        }
      }
    },
    [endpoint]
  );

  const generate = useCallback(
    (prompt: string) => {
      return executeRequest({ prompt, mode: 'generate' });
    },
    [executeRequest]
  );

  const refine = useCallback(
    (refinementPrompt: string, existingDeck: StudyDeck) => {
      return executeRequest({
        mode: 'refine',
        existingDeck,
        refinementPrompt,
      });
    },
    [executeRequest]
  );

  const retry = useCallback(() => {
    if (state.lastPrompt) {
      generate(state.lastPrompt);
    }
  }, [generate, state.lastPrompt]);

  const setDeck = useCallback((deck: StudyDeck | null) => {
    setState((prev) => ({ ...prev, data: deck, error: null }));
  }, []);

  return {
    ...state,
    generate,
    refine,
    retry,
    setDeck,
  };
}
