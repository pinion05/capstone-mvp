"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const CHUNK_SIZE = 2000;

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

  const stateRef = useRef(state);
  stateRef.current = state;
  const processingRef = useRef(false);
  const abortRef = useRef(false);

  const reset = useCallback(() => {
    abortRef.current = true;
    processingRef.current = false;
    setState({
      formattedText: "",
      cursor: 0,
      isProcessing: false,
      processedChars: 0,
      totalChars: 0,
      error: null,
    });
  }, []);

  // Main processing loop
  const processNextChunk = useCallback(async () => {
    const current = stateRef.current;
    const remaining = rawText.slice(current.cursor);

    // Nothing left to process
    if (remaining.length === 0) {
      processingRef.current = false;
      setState((prev) => ({ ...prev, isProcessing: false }));
      return;
    }

    // Not enough text to warrant a chunk yet (wait for more streaming)
    if (remaining.length < 200) {
      processingRef.current = false;
      setState((prev) => ({ ...prev, isProcessing: false }));
      return;
    }

    const chunk = remaining.slice(0, CHUNK_SIZE);

    setState((prev) => ({
      ...prev,
      isProcessing: true,
      totalChars: rawText.length,
    }));

    try {
      const res = await fetch("/api/format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: chunk, cursor: current.cursor }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();

      if (abortRef.current) return;

      const newFormatted = data.formatted || chunk;
      const newCursor = data.new_cursor || current.cursor + chunk.length;
      const processed = data.processed_chars || chunk.length;

      setState((prev) => ({
        ...prev,
        formattedText: prev.formattedText + newFormatted,
        cursor: newCursor,
        processedChars: prev.processedChars + processed,
        isProcessing: true, // stay true, more may come
        totalChars: rawText.length,
      }));

      // Check if there's more to process
      const nextRemaining = rawText.slice(newCursor);
      if (nextRemaining.length >= 200) {
        // More chunks to process — continue immediately
        processNextChunk();
      } else {
        processingRef.current = false;
        setState((prev) => ({ ...prev, isProcessing: false }));
      }
    } catch (err) {
      if (abortRef.current) return;
      const message = err instanceof Error ? err.message : "Unknown error";

      // On error, skip this chunk and advance cursor
      setState((prev) => ({
        ...prev,
        cursor: prev.cursor + chunk.length,
        processedChars: prev.processedChars + chunk.length,
        formattedText: prev.formattedText + chunk,
        isProcessing: false,
        error: message,
      }));
      processingRef.current = false;
    }
  }, [rawText]);

  // Watch rawText changes — trigger processing when new content arrives
  const lastProcessedLengthRef = useRef(0);

  useEffect(() => {
    if (rawText.length === 0) {
      reset();
      lastProcessedLengthRef.current = 0;
      return;
    }

    const current = stateRef.current;
    const unprocessedLength = rawText.length - current.cursor;

    // If there's enough unprocessed text and we're not already processing
    if (unprocessedLength >= 200 && !processingRef.current) {
      processingRef.current = true;
      processNextChunk();
    }
  }, [rawText, processNextChunk, reset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
    };
  }, []);

  return {
    formattedText: state.formattedText,
    isFormatting: state.isProcessing,
    processedChars: state.processedChars,
    totalChars: state.totalChars,
    formatError: state.error,
    resetFormatting: reset,
  };
}
