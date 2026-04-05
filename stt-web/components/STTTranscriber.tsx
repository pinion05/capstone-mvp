"use client";

import { useState, useRef, useEffect } from "react";
import { useSTTStream } from "@/hooks/useSTTStream";
import ChatPanel from "./ChatPanel";

interface TextFile { name: string; chars: number; }

export default function STTTranscriber() {
  const {
    finalText, interimText, displayText,
    isListening, progress, confidence, segmentCount,
    error, connect, disconnect,
  } = useSTTStream();

  const [textFiles, setTextFiles] = useState<TextFile[]>([]);
  const [selectedFile, setSelectedFile] = useState("인공지능.txt");
  const [speed, setSpeed] = useState(1);
  const [highlight, setHighlight] = useState<string | null>(null);

  const displayRef = useRef<HTMLDivElement>(null);

  // Detect text selection in transcript area
  useEffect(() => {
    const handleSelection = () => {
      const sel = window.getSelection();
      const text = sel?.toString().trim();
      if (text && text.length > 0) {
        setHighlight(text);
      } else {
        setHighlight(null);
      }
    };

    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("touchend", handleSelection);
    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("touchend", handleSelection);
    };
  }, []);

  useEffect(() => {
    const apiUrl =
      process.env.NEXT_PUBLIC_STT_WS_URL
        ?.replace("ws://", "http://")
        ?.replace("wss://", "https://") || "http://localhost:8765";

    fetch(`${apiUrl}/texts`)
      .then((r) => r.json())
      .then((data) => { if (data.texts) setTextFiles(data.texts); })
      .catch(() => {
        setTextFiles([
          { name: "인공지능.txt", chars: 71308 },
          { name: "기후변화.txt", chars: 71663 },
          { name: "한국역사.txt", chars: 55797 },
          { name: "로봇공학.txt", chars: 58617 },
          { name: "우주과학.txt", chars: 52452 },
          { name: "첨단기술.txt", chars: 53783 },
          { name: "한국교육.txt", chars: 52377 },
          { name: "한국경제.txt", chars: 40413 },
          { name: "한국어.txt", chars: 31408 },
          { name: "반도체.txt", chars: 29481 },
        ]);
      });
  }, []);

  useEffect(() => {
    if (displayRef.current) displayRef.current.scrollTop = displayRef.current.scrollHeight;
  }, [displayText]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%", maxWidth: "56rem", margin: "0 auto" }}>
      {/* Controls */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "0.75rem", borderRadius: "0.75rem", border: "1px solid #e4e4e7", background: "#fafafa", padding: "1rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 500, color: "#71717a" }}>텍스트 파일</label>
          <select
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
            disabled={isListening}
            style={{ borderRadius: "0.5rem", border: "1px solid #d4d4d8", background: "white", padding: "0.5rem 0.75rem", fontSize: "0.875rem" }}
          >
            {textFiles.map((f) => (
              <option key={f.name} value={f.name}>
                {f.name} ({(f.chars / 10000).toFixed(1)}만자)
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 500, color: "#71717a" }}>속도: {speed}x</label>
          <input
            type="range" min={0.1} max={1} step={0.1} value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            disabled={isListening}
            style={{ width: "7rem", accentColor: "#3b82f6" }}
          />
        </div>

        <button
          onClick={isListening ? disconnect : () => connect({ textFile: selectedFile, speed, mode: "simulate" })}
          style={{
            borderRadius: "0.5rem", padding: "0.5rem 1.5rem", fontSize: "0.875rem", fontWeight: 600,
            color: "white", border: "none", cursor: "pointer",
            background: isListening ? "#ef4444" : "#3b82f6",
          }}
        >
          {isListening ? "⏹ 중지" : "▶ 시작"}
        </button>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "1.5rem", fontSize: "0.75rem", color: "#71717a" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", background: isListening ? "#22c55e" : "#d4d4d8", animation: isListening ? "pulse 1s infinite" : "none" }} />
            {isListening ? "수신 중" : "대기"}
          </span>
          {confidence > 0 && <span>신뢰도: {(confidence * 100).toFixed(1)}%</span>}
          {segmentCount > 0 && <span>세그먼트: {segmentCount}</span>}
        </div>
      </div>

      {/* Progress bar */}
      {progress > 0 && (
        <div style={{ height: "0.375rem", borderRadius: "9999px", background: "#e4e4e7", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: "9999px", background: "#3b82f6", transition: "width 0.3s", width: `${Math.min(progress, 100)}%` }} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ borderRadius: "0.5rem", border: "1px solid #fca5a5", background: "#fef2f2", padding: "0.75rem", fontSize: "0.875rem", color: "#dc2626" }}>
          {error}
        </div>
      )}

      {/* Highlight indicator */}
      {highlight && (
        <div style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          padding: "0.5rem 0.75rem", borderRadius: "0.5rem",
          background: "#eef2ff", border: "1px solid #c7d2fe",
          fontSize: "0.8125rem", color: "#4338ca",
        }}>
          <span style={{ fontSize: "0.75rem" }}>📌</span>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            &quot;{highlight.slice(0, 80)}{highlight.length > 80 ? "..." : ""}&quot;
          </span>
          <span style={{ fontSize: "0.6875rem", color: "#6366f1", fontWeight: 500, whiteSpace: "nowrap" }}>
            {highlight.length}자 선택됨
          </span>
          <button
            onClick={() => { setHighlight(null); window.getSelection()?.removeAllRanges(); }}
            style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: "0.875rem", padding: "0 0.25rem" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Transcript */}
      <div style={{ position: "relative" }}>
        <div
          ref={displayRef}
          style={{
            minHeight: "28rem", maxHeight: "70vh", overflowY: "auto",
            borderRadius: "0.75rem", border: "1px solid #e4e4e7", background: "white",
            padding: "1.5rem", fontSize: "1rem", lineHeight: 1.75, whiteSpace: "pre-wrap", fontFamily: "inherit",
            userSelect: "text",
          }}
        >
          {displayText ? (
            <>
              <span style={{ color: "#18181b" }}>{finalText}</span>
              {interimText && (
                <span style={{ color: "#6366f1" }}>
                  {interimText}
                  <span style={{ animation: "blink 0.8s step-end infinite" }}>▎</span>
                </span>
              )}
            </>
          ) : (
            <span style={{ color: "#a1a1aa" }}>
              {isListening ? "수신 대기 중..." : "시작 버튼을 눌러 transcription을 시작하세요"}
            </span>
          )}
        </div>

        {finalText.length > 0 && (
          <div style={{ position: "absolute", top: "0.75rem", right: "0.75rem", borderRadius: "9999px", background: "#f4f4f5", padding: "0.125rem 0.625rem", fontSize: "0.75rem", color: "#71717a" }}>
            {finalText.length.toLocaleString()}자
          </div>
        )}
      </div>

      {/* Chat Agent */}
      <ChatPanel transcription={displayText} highlight={highlight} onHighlightUsed={() => setHighlight(null)} />

      {/* Inline keyframes */}
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
