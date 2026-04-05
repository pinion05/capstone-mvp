import { NextRequest } from "next/server";

const API_URL = process.env.LLM_BASE_URL || "https://api.z.ai/api/coding/paas/v4";

interface FormatRequest {
  text: string;
  cursor: number;
}

const SYSTEM_PROMPT = `너는 음성 인식(STT) 트랜스크립트를 읽기 좋게 포매팅하는 에이전트야.

규칙:
1. 아래 텍스트를 문단 단위로 줄바꿈해
2. 의미가 바뀌는 지점에서 줄바꿈
3. 너무 긴 문단은 적절히 나눠
4. 내용은 절대 변경하지 마 (줄바꿈만 추가)
5. 처리할 수 있는 범위를 판단해서 정확히 그 지점까지 처리해
   - 문장이 완전히 끝나는 지점(마침표, 물음표, 느침표)에서 멈춰
   - 2000글자를 받더라도 모두 처리할 필요 없어, 자연스러운 경계에서 중단해

반드시 아래 JSON 형식으로만 응답해. 다른 텍스트는 절대 포함하지 마:
{"formatted": "줄바꿈된 텍스트", "processed_chars": 처리한 글자 수}

processed_chars는 원본 텍스트에서 몇 글자까지 처리했는지를 숫자로 적어. 이 값은 다음 청크의 시작 위치가 돼.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || "glm-5-turbo";

  if (!apiKey) {
    return Response.json(
      { error: "LLM_API_KEY not configured" },
      { status: 500 }
    );
  }

  const body: FormatRequest = await req.json();
  const { text, cursor } = body;

  if (!text || text.length === 0) {
    return Response.json({ formatted: "", new_cursor: cursor, processed_chars: 0 });
  }

  const userMessage = `cursor: ${cursor}
=== 텍스트 (${text.length}글자) ===
${text}
=== 끝 ===`;

  try {
    const response = await fetch(`${API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json(
        { error: `LLM API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response (handle markdown code blocks)
    let parsed: { formatted: string; processed_chars: number } | null = null;

    // Try direct parse
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try extracting JSON from markdown code block
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[1].trim());
        } catch {
          // Fallback: return original text with newlines
        }
      }
    }

    if (!parsed || typeof parsed.processed_chars !== "number") {
      // LLM failed to return valid JSON — return original text as-is, advance cursor by full length
      return Response.json({
        formatted: text,
        new_cursor: cursor + text.length,
        processed_chars: text.length,
      });
    }

    const processedChars = Math.max(1, Math.min(parsed.processed_chars, text.length));
    const newCursor = cursor + processedChars;

    return Response.json({
      formatted: parsed.formatted || text,
      new_cursor: newCursor,
      processed_chars: processedChars,
    });
  } catch (err) {
    return Response.json(
      { error: "Format request failed", details: String(err) },
      { status: 500 }
    );
  }
}
