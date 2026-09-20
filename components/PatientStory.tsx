"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Diagram } from "@/components/Diagram";
import { BodyLocator, type BodyType } from "@/components/BodyLocator";
import { InkCheck, InkSound, InkStroke } from "@/components/Ink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HowToArt } from "@/components/HowToArt";
import type { DiagramId } from "@/lib/anatomy/conditions";
import type { Slide } from "@/lib/explain";
import { bestVoice, whenVoicesReady } from "@/lib/voices";
import { asset } from "@/lib/staticMode";

interface Props {
  slides: Slide[];
  diagram: DiagramId | null;
  marks: string[];
  langTag: string;
  rtl: boolean;
  body?: BodyType;
  onBack: () => void;
  /** Open on this screen instead of the first (deep links and screenshots). */
  initialIndex?: number;
}

/**
 * The turned screen, as a paced story.
 *
 * One idea per screen in the largest type the viewport allows, read aloud,
 * advancing when the voice finishes. A patient who cannot read the label cannot
 * skim a page either; pacing is the accessibility feature, not a flourish.
 *
 * Audio is fetched per slide from /api/tts (cached on disk, so a demo replay
 * costs nothing) with the browser voice as fallback. The next slide's audio is
 * prefetched while the current one plays, so there is no gap.
 */
export function PatientStory({ slides, diagram, marks, langTag, rtl, body: initialBody = "male", onBack, initialIndex = 0 }: Props) {
  const [body, setBody] = useState<BodyType>(initialBody);
  const [i, setI] = useState(Math.min(initialIndex, slides.length - 1));
  const [playing, setPlaying] = useState(true);
  const [voice, setVoice] = useState<"elevenlabs" | "browser" | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cache = useRef<Map<number, Promise<string | null>>>(new Map());
  // The free ElevenLabs tier allows two requests in flight. Prefetch plus the
  // current slide plus an impatient tap was three, and the third fell back to
  // the browser voice mid-story. All TTS requests now go through one lane.
  const lane = useRef<Promise<unknown>>(Promise.resolve());
  const slide = slides[Math.min(i, slides.length - 1)];
  const last = i >= slides.length - 1;

  // Type is sized to the amount of text on the screen, so a long thought sets
  // smaller and the whole screen, controls included, fits without scrolling.
  const chars = slide.title.length + slide.lines.join(" ").length + (slide.steps ?? []).join(" ").length;
  const shrink = chars <= 50 ? 1 : chars <= 100 ? 0.82 : chars <= 160 ? 0.66 : chars <= 240 ? 0.54 : chars <= 340 ? 0.46 : 0.4;
  const size = (minRem: number, vw: number, maxRem: number) =>
    `clamp(${minRem}rem, ${(vw * shrink).toFixed(2)}vw, ${(maxRem * shrink).toFixed(2)}rem)`;

  // NEXT_PUBLIC_VOICE=browser: no recorded or generated audio at all, the
  // browser's own voice reads every screen. Set in .env.local for the dev
  // server and by scripts/export-static.sh for the published site.
  const browserOnly = process.env.NEXT_PUBLIC_VOICE === "browser";

  const fetchAudio = useCallback(
    (n: number): Promise<string | null> => {
      if (browserOnly) return Promise.resolve(null);
      if (n < 0 || n >= slides.length) return Promise.resolve(null);
      const hit = cache.current.get(n);
      if (hit) return hit;
      // The static site ships prebuilt clips with the slide; the full app asks
      // the server, which serves from its own cache before ElevenLabs.
      const once = () =>
        (slides[n].audio
          ? fetch(asset(slides[n].audio!))
          : fetch("/api/tts", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ text: slides[n].spoken }),
            })
        ).then(async (r) => (r.ok ? URL.createObjectURL(await r.blob()) : r.status === 503 ? "off" : null));
      const p: Promise<string | null> = lane.current
        .then(once)
        .then(async (url) => {
          if (url === "off") return null; // no voice service: straight to the browser voice
          if (url) return url;
          await new Promise((res) => setTimeout(res, 900));
          const again = await once();
          return again === "off" ? null : again;
        })
        .catch(() => null);
      lane.current = p.catch(() => null);
      cache.current.set(n, p);
      return p;
    },
    [slides, browserOnly],
  );

  const stopAll = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  const advance = useCallback(() => {
    setI((n) => (n < slides.length - 1 ? n + 1 : n));
  }, [slides.length]);

  // Play the current slide; advance when it ends.
  useEffect(() => {
    if (!playing) return;
    let cancelled = false;
    stopAll();
    setVoice(null); // the label describes THIS slide's voice, never the last one's
    fetchAudio(i + 1); // prefetch

    (async () => {
      const url = await fetchAudio(i);
      if (cancelled) return;
      if (url) {
        setVoice("elevenlabs");
        const a = new Audio(url);
        audioRef.current = a;
        a.onended = () => {
          if (!cancelled && i < slides.length - 1) advance();
          else if (!cancelled) setPlaying(false);
        };
        a.play().catch(() => {
          // Two reasons play() rejects: autoplay is blocked until a gesture
          // (leave the slide up, wait for a tap), or this slide was already
          // left - stopAll() paused a clip that was still starting. Only the
          // first should stop the story.
          if (!cancelled) setPlaying(false);
        });
        return;
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        setVoice("browser");
        await whenVoicesReady();
        if (cancelled) return;
        const u = new SpeechSynthesisUtterance(slide.spoken);
        u.lang = langTag;
        const v = bestVoice(langTag);
        if (v) u.voice = v;
        u.rate = 0.9;
        u.onend = () => {
          if (!cancelled && i < slides.length - 1) advance();
          else if (!cancelled) setPlaying(false);
        };
        window.speechSynthesis.speak(u);
      }
    })();

    return () => {
      cancelled = true;
      stopAll();
    };
  }, [i, playing, slide.spoken, langTag, slides.length, fetchAudio, stopAll, advance]);

  // Keyboard: space pauses, arrows move.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); }
      if (e.key === "ArrowRight") { setI((n) => Math.min(slides.length - 1, n + 1)); setPlaying(true); }
      if (e.key === "ArrowLeft") { setI((n) => Math.max(0, n - 1)); setPlaying(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slides.length]);

  return (
    <main
      dir={rtl ? "rtl" : "ltr"}
      lang={langTag}
      className="flex-1 w-full flex flex-col"
      style={{ minHeight: "calc(100vh - 40px)" }}
      onClick={() => setPlaying((p) => !p)}
    >
      {/* Progress: one segment per slide. Also the only navigation on screen. */}
      <div className="no-print px-6 pt-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-1.5" role="tablist" aria-label="Screens">
          {slides.map((s, n) => (
            <button
              key={n}
              role="tab"
              aria-selected={n === i}
              aria-label={`Go to ${s.title}`}
              onClick={() => { setI(n); setPlaying(true); }}
              className="h-3 flex-1 transition-colors"
              style={{ color: n <= i ? "var(--accent)" : "var(--line)" }}
            >
              <InkStroke className="block w-full h-full" draw={n === i} />
            </button>
          ))}
        </div>
        <p className="meta-chip mt-3" aria-live="polite">{i + 1} of {slides.length}</p>
      </div>

      <section key={i} className="no-print rise flex-1 min-h-0 overflow-y-auto flex flex-col justify-center px-6 sm:px-12 py-6 max-w-6xl w-full mx-auto">
       <div className={slide.kind === "picture" && diagram ? "lg:grid lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] lg:gap-16 lg:items-center" : ""}>
        {slide.kind === "picture" && diagram && (
          <div className="mx-auto w-full max-w-[440px] mb-6 lg:mb-0" style={{ maxWidth: "min(440px, 58vh)" }} onClick={(e) => e.stopPropagation()}>
            <BodyLocator view={diagram} marks={marks} body={body} />
            {diagram === "body" && <div className="flex flex-wrap gap-2 mt-3 no-print">
              {(["female", "male"] as BodyType[]).map((b) => (
                <button
                  key={b}
                  onClick={() => setBody(b)}
                  className={`chip ${body === b ? "on" : ""}`}
                >
                  {b === "female" ? "Female" : "Male"}
                </button>
              ))}
            </div>}
          </div>
        )}

       <div>
        {slide.kind === "howto" && slide.art && (
          <div className="flex items-end gap-6 mb-6">
            <div className="w-40 sm:w-56 p-4">
              <HowToArt id={slide.art} />
            </div>
                      </div>
        )}

        {slide.kicker && (
          <p className="text-[15px] font-bold text-[color:var(--accent-text)] mb-3">
            {slide.kicker}
          </p>
        )}

        <h1
          className="display leading-[0.98]"
          style={{
            fontSize:
              slide.kind === "picture" ? size(1.6, 5.5, 4.5)
              : slide.kind === "howto" ? size(1.5, 4.5, 3.4)
              : size(1.8, 8, 6.5),
          }}
        >
          {slide.title}
        </h1>

        {slide.steps && slide.steps.length > 0 && (
          <ol className="mt-6 space-y-3">
            {slide.steps.map((st, n) => (
              <li key={n} className="flex gap-4 items-start" style={{ fontSize: size(1.05, 2.4, 1.8), lineHeight: 1.3 }}>
                <span className="flex-none w-8 display-sm italic" style={{ color: "var(--accent-text)" }}>
                  {n + 1}
                </span>
                <span>{st}</span>
              </li>
            ))}
          </ol>
        )}

        {slide.lines.length > 0 && (
          <div className={slide.kind === "howto" ? "mt-4" : "mt-8 space-y-5"}>
            {slide.lines.map((l, n) => (
              <p
                key={n}
                className={slide.kind === "todo" ? "flex gap-4 items-start" : ""}
                style={{ fontSize: slide.kind === "howto" ? size(1, 2, 1.5) : size(1.2, 3.2, 2.4), lineHeight: 1.3, color: slide.kind === "howto" ? "var(--muted)" : undefined }}
              >
                {slide.kind === "todo" && <InkCheck className="flex-none mt-2 text-[color:var(--accent-text)]" size={30} draw delay={250 + n * 220} />}
                <span className={n === 1 && slide.kind === "medicine" ? "font-semibold" : ""}>{l}</span>
              </p>
            ))}
          </div>
        )}
       </div>
       </div>
      </section>

      <footer
        className="no-print flex flex-wrap items-center gap-3 px-6 pb-6 text-sm text-[color:var(--muted)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={() => setPlaying((p) => !p)} className="btn btn-secondary">
          {playing ? "Pause" : last ? "Replay" : "Play"}
        </button>
        <button onClick={() => { setI((n) => Math.max(0, n - 1)); setPlaying(true); }} disabled={i === 0} className="btn btn-secondary disabled:opacity-40">
          &larr;
        </button>
        <button onClick={() => { setI((n) => Math.min(slides.length - 1, n + 1)); setPlaying(true); }} disabled={last} className="btn btn-secondary disabled:opacity-40">
          &rarr;
        </button>
        {last && (
          <button onClick={() => window.print()} className="btn btn-primary">
            Print this
          </button>
        )}
        <span className="ml-auto flex items-center gap-2">
          {voice && <InkSound speaking={playing} className="text-[color:var(--accent-text)]" />}
          {voice === "browser" ? "Built-in voice" : voice === "elevenlabs" ? "Voice: ElevenLabs" : ""}
        </span>
        <ThemeToggle />
        <button onClick={onBack} className="link-action">
          Back to the clinician view
        </button>
      </footer>

      {/* Paper: one sheet to take home, laid out as a handout, not a transcript. */}
      <div className="hidden print:block print-sheet">
        <header>
          <span className="print-wordmark">Aperta</span>
          <span>{new Date().toLocaleDateString(langTag, { year: "numeric", month: "long", day: "numeric" })}</span>
        </header>
        {(() => {
          const picture = slides.find((x) => x.kind === "picture");
          const meds = slides.filter((x) => x.kind === "medicine");
          const todo = slides.find((x) => x.kind === "todo");
          const howtos = slides.filter((x) => x.kind === "howto");
          return (
            <>
              {picture && (
                <section className="print-hero">
                  {diagram && <div className="print-pic"><Diagram id={diagram} marks={marks} /></div>}
                  <div>
                    <p className="print-kicker">{picture.kicker ?? "What happened"}</p>
                    <h1 className="display">{picture.title}</h1>
                    {picture.lines.map((l, k) => <p key={k} className="print-lede">{l}</p>)}
                  </div>
                </section>
              )}
              {meds.length > 0 && (
                <section>
                  <p className="print-kicker">{meds[0].kicker ?? "Your medicines"}</p>
                  {meds.map((m, n) => (
                    <div key={n} className="print-row">
                      <p className="print-med">{m.title}</p>
                      {m.lines.map((l, k) => <p key={k} className={k === 1 ? "print-strong" : ""}>{l}</p>)}
                    </div>
                  ))}
                </section>
              )}
              {todo && todo.lines.length > 0 && (
                <section>
                  <p className="print-kicker">{todo.kicker ?? "What to do"}</p>
                  <ul className="print-list">
                    {todo.lines.map((l, k) => <li key={k}><span className="print-box" aria-hidden />{l}</li>)}
                  </ul>
                </section>
              )}
              {howtos.map((h, n) => (
                <section key={n}>
                  <p className="print-kicker">{h.kicker ?? "How to do it"}</p>
                  <h2 className="display-sm print-h2">{h.title}</h2>
                  {h.steps && h.steps.length > 0 && (
                    <ol className="print-steps">
                      {h.steps.map((st, k) => <li key={k}><span className="print-n">{k + 1}</span>{st}</li>)}
                    </ol>
                  )}
                  {h.lines.map((l, k) => <p key={k} className="print-lede">{l}</p>)}
                </section>
              ))}
            </>
          );
        })()}
        <footer>Educational demo. Not medical advice. Always confirm with your pharmacist or physician.</footer>
      </div>
    </main>
  );
}
