import { NextRequest, NextResponse } from "next/server";
import { parseNote } from "@/lib/parseNote";
import { activeProvider, type ImagePart } from "@/lib/llm";
import { byId } from "@/lib/anatomy/conditions";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGES = 4;
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Accepts pasted text, photographed pages, or both, as multipart form data.
 * Text alone works with no API key; a photographed page needs a vision model.
 */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const text = String(form.get("text") ?? "");
  const files = form.getAll("images").filter((f): f is File => f instanceof File);

  if (!text.trim() && files.length === 0) {
    return NextResponse.json({ error: "Paste a note or add a photo." }, { status: 400 });
  }
  if (files.length > 0 && activeProvider() === "none") {
    return NextResponse.json(
      {
        error: "Reading a photographed page needs a vision model.",
        detail: "Set GEMINI_API_KEY in .env.local, or paste the note as text - text needs no key.",
      },
      { status: 503 },
    );
  }
  if (files.length > MAX_IMAGES) {
    return NextResponse.json({ error: `Too many images (max ${MAX_IMAGES}).` }, { status: 400 });
  }

  const images: ImagePart[] = [];
  for (const f of files) {
    if (f.size > MAX_BYTES || !f.type.startsWith("image/")) {
      return NextResponse.json({ error: `"${f.name}" is not a usable image.` }, { status: 400 });
    }
    images.push({ mimeType: f.type, data: Buffer.from(await f.arrayBuffer()).toString("base64") });
  }

  try {
    const parsed = await parseNote(text, images);
    const condition = parsed.conditionId ? byId(parsed.conditionId) : null;
    return NextResponse.json({
      ...parsed,
      // Hand the client the plain sentence too, so the editor pre-fills.
      conditionPlain: condition?.plain ?? null,
      conditionLabel: condition?.label ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Could not read the note.", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
  // Nothing here is written to disk. The note lives for one request.
}
