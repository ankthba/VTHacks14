import { NextRequest, NextResponse } from "next/server";
import { extractFromImages } from "@/lib/extract";
import { activeProvider, type ImagePart } from "@/lib/llm";
import { getScenario } from "@/lib/fixtures";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGES = 6;
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const demo = url.searchParams.get("demo");
  if (demo) {
    const s = getScenario(demo);
    return NextResponse.json({
      bottles: s.bottles,
      discharge: s.discharge ?? [],
      demo: true,
    });
  }

  if (activeProvider() === "none") {
    return NextResponse.json(
      {
        error: "No vision model configured.",
        detail:
          "Set GEMINI_API_KEY in .env.local, or run the demo scenarios which need no key.",
      },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const files = form.getAll("images").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No images uploaded." }, { status: 400 });
  }
  if (files.length > MAX_IMAGES) {
    return NextResponse.json(
      { error: `Too many images (max ${MAX_IMAGES}).` },
      { status: 400 },
    );
  }

  const images: ImagePart[] = [];
  for (const f of files) {
    if (f.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `"${f.name}" is larger than 8 MB.` },
        { status: 400 },
      );
    }
    if (!f.type.startsWith("image/")) {
      return NextResponse.json(
        { error: `"${f.name}" is not an image.` },
        { status: 400 },
      );
    }
    const buf = Buffer.from(await f.arrayBuffer());
    images.push({ mimeType: f.type, data: buf.toString("base64") });
  }

  const kind = url.searchParams.get("kind") === "discharge" ? "discharge" : "bottles";

  try {
    const records = await extractFromImages(images, kind);
    return NextResponse.json(
      kind === "discharge" ? { discharge: records } : { bottles: records },
    );
  } catch (e) {
    return NextResponse.json(
      { error: "Could not read the labels.", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
  // Images are never written to disk and never leave this request.
}
