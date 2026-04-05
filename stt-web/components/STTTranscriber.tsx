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

  useEffect(() => {
    const handleSelection = () => {
      const sel = window.getSelection();
      const text = sel?.toString().trim();
      setHighlight(text && text.length > 0 ? text : null);
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
    <>
      {/* Top bar */}
      <div style={{
        flexShrink: 0, display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.625rem 1rem", background: "white",
        borderBottom: "1px solid #e4e4e7",
      }}>
        <select
          value={selectedFile}
          onChange={(e) => setSelectedFile(e.target.value)}
          disabled={isListening}
          style={{ borderRadius: "0.375rem", border: "1px solid #d4d4d8", background: "white", padding: "0.375rem 0.5rem", fontSize: "0.8125rem" }}
        >
          {textFiles.map((f) => (
            <option key={f.name} value={f.name}>{f.name} ({(f.chars / 10000).toFixed(1)}만자)</option>
          ))}
        </select>

        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
          <span style={{ fontSize: "0.75rem", color: "#71717a" }}>{speed}x</span>
          <input
            type="range" min={0.1} max={1} step={0.1} value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            disabled={isListening}
            style={{ width: "5rem", accentColor: "#3b82f6" }}
          />
        </div>

        <button
          onClick={isListening ? disconnect : () => connect({ textFile: selectedFile, speed, mode: "simulate" })}
          style={{
            borderRadius: "0.375rem", padding: "0.375rem 1rem", fontSize: "0.8125rem", fontWeight: 600,
            color: "white", border: "none", cursor: "pointer",
            background: isListening ? "#ef4444" : "#3b82f6",
          }}
        >
          {isListening ? "⏹ 중지" : "▶ 시작"}
        </button>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.6875rem", color: "#a1a1aa" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <span style={{ width: "0.375rem", height: "0.375rem", borderRadius: "50%", background: isListening ? "#22c55e" : "#d4d4d8", animation: isListening ? "pulse 1s infinite" : "none" }} />
            {isListening ? "수신 중" : "대기"}
          </span>
          {confidence > 0 && <span>신뢰도 {(confidence * 100).toFixed(1)}%</span>}
          {segmentCount > 0 && <span>세그먼트 {segmentCount}</span>}
          {finalText.length > 0 && <span>{finalText.length.toLocaleString()}자</span>}
        </div>
      </div>

      {/* Progress bar */}
      {progress > 0 && (
        <div style={{ flexShrink: 0, height: "2px", background: "#e4e4e7" }}>
          <div style={{ height: "100%", background: "#3b82f6", transition: "width 0.3s", width: `${Math.min(progress, 100)}%` }} />
        </div>
      )}

      {/* Main split area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left: Transcript */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid #e4e4e7", position: "relative" }}>
          {/* Highlight indicator */}
          {highlight && (
            <div style={{
              flexShrink: 0, display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.375rem 0.75rem", background: "#eef2ff", borderBottom: "1px solid #c7d2fe",
              fontSize: "0.75rem", color: "#4338ca",
            }}>
              <span>📌</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                &quot;{highlight.slice(0, 100)}{highlight.length > 100 ? "..." : ""}&quot;
              </span>
              <span style={{ fontSize: "0.625rem", color: "#6366f1", fontWeight: 500, whiteSpace: "nowrap" }}>
                {highlight.length}자
              </span>
              <button
                onClick={() => { setHighlight(null); window.getSelection()?.removeAllRanges(); }}
                style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: "0.75rem", padding: "0 0.125rem" }}
              >
                ✕
              </button>
            </div>
          )}

          {error && (
            <div style={{
              flexShrink: 0, padding: "0.375rem 0.75rem", background: "#fef2f2",
              borderBottom: "1px solid #fecaca", fontSize: "0.75rem", color: "#dc2626",
            }}>
              {error}
            </div>
          )}

          <div
            ref={displayRef}
            style={{
              flex: 1, overflowY: "auto", padding: "1.25rem",
              fontSize: "0.9375rem", lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "inherit",
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
        </div>

        {/* Right: Chat */}
        <div style={{ width: "380px", flexShrink: 0, display: "flex", flexDirection: "column" }}>
          <ChatPanel transcription={displayText} highlight={highlight} onHighlightUsed={() => setHighlight(null)} />
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </>
  );
}
