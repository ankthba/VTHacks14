import { z } from "zod";

export type Provider = "gemini" | "anthropic" | "none";

export function activeProvider(): Provider {
  const forced = process.env.LLM_PROVIDER as Provider | undefined;
  if (forced === "gemini" && process.env.GEMINI_API_KEY) return "gemini";
  if (forced === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "none";
}

export interface ImagePart {
  mimeType: string;
  /** base64, no data: prefix */
  data: string;
}

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

/** Raw text generation. Throws if no provider is configured. */
export async function generate(
  prompt: string,
  images: ImagePart[] = [],
): Promise<string> {
  const provider = activeProvider();
  if (provider === "gemini") return generateGemini(prompt, images);
  if (provider === "anthropic") return generateAnthropic(prompt, images);
  throw new Error(
    "No LLM provider configured. Set GEMINI_API_KEY (or ANTHROPIC_API_KEY) in .env.local, or use ?demo=1.",
  );
}

async function generateGemini(prompt: string, images: ImagePart[]) {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = client.getGenerativeModel({ model: GEMINI_MODEL });
  const parts: object[] = [
    ...images.map((i) => ({ inlineData: { mimeType: i.mimeType, data: i.data } })),
    { text: prompt },
  ];
  const res = await model.generateContent(parts as never);
  return res.response.text();
}

async function generateAnthropic(prompt: string, images: ImagePart[]) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            ...images.map((i) => ({
              type: "image",
              source: { type: "base64", media_type: i.mimeType, data: i.data },
            })),
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return (json.content ?? [])
    .filter((c: { type: string }) => c.type === "text")
    .map((c: { text: string }) => c.text)
    .join("");
}

/** Pulls a JSON value out of prose or a ``` fence. */
function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced ? fenced[1] : raw).trim();
  const start = body.search(/[[{]/);
  if (start === -1) return body;
  const open = body[start];
  const close = open === "[" ? "]" : "}";
  const end = body.lastIndexOf(close);
  return end > start ? body.slice(start, end + 1) : body.slice(start);
}

/**
 * Generate and validate against a schema, retrying once on a parse failure with
 * the error fed back. Every model response in this app goes through here.
 */
export async function generateJson<T>(
  prompt: string,
  schema: z.ZodType<T>,
  images: ImagePart[] = [],
): Promise<T> {
  let lastErr = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const p =
      attempt === 0
        ? prompt
        : `${prompt}\n\nYour previous reply could not be parsed (${lastErr}). Reply with ONLY valid JSON matching the schema. No prose, no code fence.`;
    const raw = await generate(p, images);
    try {
      return schema.parse(JSON.parse(extractJson(raw)));
    } catch (e) {
      lastErr = e instanceof Error ? e.message.slice(0, 200) : String(e);
    }
  }
  throw new Error(`Model did not return valid JSON after 2 attempts: ${lastErr}`);
}
