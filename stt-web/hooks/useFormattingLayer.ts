"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const CHUNK_SIZE = 2000;
const MIN_BUFFER = 200;

interface FormattingState {
  formattedText: string;
  cursor: number;
  isProcessing: boolean;
  processedChars: number;
  totalChars: number;
  error: string | null;
}

export function useFormattingLayer(rawText: string) {
  const [state, setState] = useState<FormattingState>({
    formattedText: "",
    cursor: 0,
    isProcessing: false,
    processedChars: 0,
    totalChars: 0,
    error: null,
  });

  // Use refs to avoid dependency cycles
  const cursorRef = useRef(0);
  const formattedRef = useRef("");
  const processedRef = useRef(0);
  const busyRef = useRef(false);
  const rawTextRef = useRef(rawText);
  rawTextRef.current = rawText;

  const reset = useCallback(() => {
    cursorRef.current = 0;
    formattedRef.current = "";
    processedRef.current = 0;
    busyRef.current = false;
    setState({
      formattedText: "",
      cursor: 0,
      isProcessing: false,
      processedChars: 0,
      totalChars: 0,
      error: null,
    });
  }, []);

  // Single processing function — no recursion, no state deps
  const processChunk = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;

    try {
      while (true) {
        const cursor = cursorRef.current;
        const remaining = rawTextRef.current.slice(cursor);

        // Nothing left or not enough buffer
        if (remaining.length < MIN_BUFFER) {
          setState((prev) => ({ ...prev, isProcessing: false }));
          break;
        }

        const chunk = remaining.slice(0, CHUNK_SIZE);

        setState((prev) => ({
          ...prev,
          isProcessing: true,
          totalChars: rawTextRef.current.length,
        }));

        try {
          const res = await fetch("/api/format", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: chunk, cursor }),
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || `HTTP ${res.status}`);
          }

          const data = await res.json();
          const newFormatted = data.formatted || chunk;
          const newCursor = data.new_cursor || cursor + chunk.length;
          const processed = data.processed_chars || chunk.length;

          cursorRef.current = newCursor;
          formattedRef.current = formattedRef.current + newFormatted;
          processedRef.current = processedRef.current + processed;

          setState((prev) => ({
            ...prev,
            formattedText: formattedRef.current,
            cursor: newCursor,
            processedChars: processedRef.current,
            totalChars: rawTextRef.current.length,
          }));

          // Check if there's enough for another chunk
          const nextRemaining = rawTextRef.current.slice(newCursor);
          if (nextRemaining.length < MIN_BUFFER) {
            setState((prev) => ({ ...prev, isProcessing: false }));
            break;
          }
          // Continue loop for next chunk
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          // Skip chunk on error
          cursorRef.current = cursor + chunk.length;
          processedRef.current = processedRef.current + chunk.length;
          formattedRef.current = formattedRef.current + chunk;
          setState((prev) => ({
            ...prev,
            cursor: cursorRef.current,
            processedChars: processedRef.current,
            formattedText: formattedRef.current,
            isProcessing: false,
            error: message,
          }));
          break;
        }
      }
    } finally {
      busyRef.current = false;
    }
  }, []); // No dependencies — everything through refs

  // Watch rawText — trigger processing when buffer grows
  useEffect(() => {
    if (rawText.length === 0) {
      reset();
      return;
    }

    const unprocessed = rawText.length - cursorRef.current;
    if (unprocessed >= MIN_BUFFER && !busyRef.current) {
      processChunk();
    }
  }, [rawText, processChunk, reset]);

  return {
    formattedText: state.formattedText,
    isFormatting: state.isProcessing,
    processedChars: state.processedChars,
    totalChars: state.totalChars,
    formatError: state.error,
    resetFormatting: reset,
  };
}
