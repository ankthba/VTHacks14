"use client";

import { useEffect, useState } from "react";
import { Diagram } from "@/components/Diagram";
import type { DiagramId } from "@/lib/anatomy/conditions";

/**
 * Whole body first, then the part.
 *
 * A patient's first question is not "what is a distal radius" but "where on
 * me". So the picture opens on a full figure with the region glowing, holds a
 * beat, then zooms into the marked detail drawing. Tap to go back out. It is
 * pure SVG and CSS, so it works with no network, and it prints as the detail.
 */

/** Where each anatomical view lives on the figure (viewBox 0 0 200 440). */
const REGION: Record<DiagramId, { x: number; y: number; r: number }> = {
  head: { x: 100, y: 40, r: 30 },
  mouth: { x: 100, y: 56, r: 14 },
  shoulder: { x: 64, y: 108, r: 22 },
  heart: { x: 110, y: 148, r: 22 },
  lung: { x: 100, y: 150, r: 34 },
  abdomen: { x: 100, y: 212, r: 30 },
  spine: { x: 100, y: 236, r: 30 },
  wrist: { x: 32, y: 262, r: 18 },
  hip: { x: 78, y: 262, r: 22 },
  knee: { x: 82, y: 342, r: 20 },
  ankle: { x: 84, y: 420, r: 16 },
  body: { x: 100, y: 200, r: 90 },
};

export type BodyType = "neutral" | "female" | "male";

/**
 * Three silhouettes with the same limb positions, so every region lands in the
 * same place. Differences are proportion only - shoulder and hip width, waist,
 * hair - kept schematic rather than anatomical, because the point is "which
 * body is this" not a figure study.
 */
export function Figure({ region, body }: { region: DiagramId; body: BodyType }) {
  const p = REGION[region];
  const f = body === "female";
  const m = body === "male";
  const shoulder = m ? 60 : f ? 50 : 56; // half-width at the shoulders
  const hip = m ? 46 : f ? 56 : 50;      // half-width at the hips
  const waist = f ? 40 : m ? 50 : 46;    // half-width at the waist
  return (
    <svg viewBox="0 0 200 440" className="w-full h-auto" role="img" aria-label="Where on the body" style={{ color: "var(--foreground)" }}>
      <g fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        {/* Head and hair. */}
        <ellipse cx="100" cy="40" rx="24" ry="30" />
        {f && <path d="M76 44 Q72 10 100 8 Q128 10 124 44 Q126 70 118 84 M82 84 Q74 70 76 44" />}
        {m && <path d="M77 34 Q82 12 100 10 Q118 12 123 34" />}
        <path d="M92 70 L92 84 M108 70 L108 84" />
        {/* Torso: shoulders, waist, hips. */}
        <path d={`M${100 - shoulder} 100 Q100 88 ${100 + shoulder} 100 L${100 + waist} 190 L${100 + hip} 240 Q${100 + hip - 4} 262 ${100 + hip - 20} 270 L${100 - hip + 20} 270 Q${100 - hip + 4} 262 ${100 - hip} 240 L${100 - waist} 190 Z`} />
        {/* Arms. */}
        <path d={`M${100 - shoulder} 100 Q30 150 26 250 Q24 262 32 270 Q42 262 40 250 Q44 170 ${100 - shoulder + 6} 130`} />
        <path d={`M${100 + shoulder} 100 Q170 150 174 250 Q176 262 168 270 Q158 262 160 250 Q156 170 ${100 + shoulder - 6} 130`} />
        {/* Legs. */}
        <path d="M74 270 L70 350 L74 428 Q84 436 96 428 L96 350 L100 300 L104 350 L104 428 Q116 436 126 428 L130 350 L126 270" />
      </g>
      <circle cx={p.x} cy={p.y} r={p.r} fill="var(--high-bg)" stroke="var(--high)" strokeWidth={3} opacity={0.9}>
        <animate attributeName="r" values={`${p.r};${p.r + 6};${p.r}`} dur="1.6s" repeatCount="indefinite" />
      </circle>
      <circle cx={p.x} cy={p.y} r={6} fill="var(--high)" />
    </svg>
  );
}

export function BodyLocator({
  view,
  marks,
  body = "neutral",
  autoZoomMs = 1800,
}: {
  view: DiagramId;
  marks: string[];
  body?: BodyType;
  autoZoomMs?: number;
}) {
  const [zoomed, setZoomed] = useState(false);
  const p = REGION[view];

  useEffect(() => {
    setZoomed(false);
    if (view === "body") return;
    const t = setTimeout(() => setZoomed(true), autoZoomMs);
    return () => clearTimeout(t);
  }, [view, autoZoomMs]);

  // Scale the figure around the region so it flies toward the viewer while
  // the detail fades in over it.
  const origin = `${(p.x / 200) * 100}% ${(p.y / 440) * 100}%`;

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); if (view !== "body") setZoomed((z) => !z); }}
      className="relative w-full float-card overflow-hidden text-left"
      style={{ aspectRatio: "1 / 1" }}
      aria-label={zoomed ? "Show the whole body" : "Zoom in"}
    >
      <div
        className="absolute inset-0 flex items-center justify-center p-4 transition-all duration-700 ease-out"
        style={{
          transformOrigin: origin,
          transform: zoomed ? "scale(3.2)" : "scale(1)",
          opacity: zoomed ? 0 : 1,
        }}
      >
        <div className="h-full" style={{ aspectRatio: "200 / 440" }}>
          <Figure region={view} body={body} />
        </div>
      </div>
      <div
        className="absolute inset-0 flex items-center justify-center p-6 transition-all duration-700 ease-out"
        style={{ transform: zoomed ? "scale(1)" : "scale(0.6)", opacity: zoomed ? 1 : 0 }}
      >
        <div className="w-full max-w-[420px]">
          <Diagram id={view} marks={marks} />
        </div>
      </div>
      <span className="absolute bottom-3 right-3 meta-chip no-print">
        {zoomed ? "Tap to see the whole body" : "Zooming in…"}
      </span>
    </button>
  );
}
