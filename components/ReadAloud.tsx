"use client";

import { useRef, useState } from "react";

type State = "idle" | "loading" | "playing";

/**
 * Read-aloud via ElevenLabs, falling back to the browser's built-in speech
 * synthesis when no key is configured. This is the accessibility feature for a
 * low-vision user, so it must work even when the paid API does not.
 */
export function ReadAloud({ text, lang }: { text: string; lang: string }) {
  const [state, setState] = useState<State>("idle");
  const [note, setNote] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function stop() {
    audioRef.current?.pause();
    audioRef.current = null;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setState("idle");
  }

  function speakInBrowser() {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setNote("This browser cannot read text aloud.");
      setState("idle");
      return;
    }
    const u = new SpeechSynthesisUtterance(text.slice(0, 6000));
    u.rate = 0.92;
    u.lang = lang;
    u.onend = () => setState("idle");
    u.onerror = () => setState("idle");
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setState("playing");
  }

  async function play() {
    setNote(null);
    setState("loading");
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        // 503 = no key, 502 = ElevenLabs refused (quota, voice, network).
        // Either way the built-in voice reads it; the note just says which.
        setNote(
          res.status === 503
            ? "Using your browser's built-in voice (no ElevenLabs key set)."
            : "Using your browser's built-in voice (ElevenLabs unavailable right now).",
        );
        speakInBrowser();
        return;
      }

      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audioRef.current = audio;
      audio.onended = () => setState("idle");
      await audio.play();
      setState("playing");
    } catch {
      setNote("Using your browser's built-in voice.");
      speakInBrowser();
    }
  }

  return (
    <div className="no-print">
      <button
        type="button"
        onClick={state === "playing" ? stop : play}
        disabled={state === "loading"}
        className="btn btn-secondary disabled:opacity-60"
      >
        {state === "loading"
          ? "Preparing audio..."
          : state === "playing"
            ? "Stop reading"
            : "Read this aloud"}
      </button>
      {note && <p className="text-sm text-[color:var(--muted)] mt-1">{note}</p>}
    </div>
  );
}
