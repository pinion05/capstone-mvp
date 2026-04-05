import STTTranscriber from "@/components/STTTranscriber";

export const metadata = {
  title: "STT Streaming Demo",
  description: "실시간 음성인식 스트리밍 데모",
};

export default function STTPage() {
  return (
    <html lang="ko">
      <body style={{ margin: 0, background: "#fafafa" }}>
        <main style={{ minHeight: "100vh", padding: "3rem 1rem" }}>
          <div style={{ maxWidth: "56rem", margin: "0 auto" }}>
            <div style={{ marginBottom: "2rem" }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#18181b", margin: 0 }}>
                STT Streaming Demo
              </h1>
              <p style={{ marginTop: "0.25rem", fontSize: "0.875rem", color: "#71717a", margin: "0.25rem 0 0 0" }}>
                WebSocket 기반 실시간 transcription — 클릭 한 번으로 시작
              </p>
            </div>
            <STTTranscriber />
            <footer style={{ marginTop: "2rem", borderTop: "1px solid #e4e4e7", paddingTop: "1rem", textAlign: "center", fontSize: "0.75rem", color: "#a1a1aa" }}>
              Mock STT Server on Railway
            </footer>
          </div>
        </main>
      </body>
    </html>
  );
}
