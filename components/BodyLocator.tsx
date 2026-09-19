"use client";

import { useEffect, useState } from "react";
import { Diagram } from "@/components/Diagram";
import { asset } from "@/lib/staticMode";
import { SPOT_SRC } from "@/lib/anatomy/art";
import { InkImage } from "@/components/InkImage";
import type { DiagramId } from "@/lib/anatomy/conditions";

/**
 * Whole body first, then the part.
 *
 * A patient's first question is not "what is a distal radius" but "where on
 * me". So the picture opens on a hand-drawn figure - hers or his - with a red
 * spot over the place, holds a beat, then zooms into the marked detail
 * drawing. Tap to go back out. The figures and the spot are the clinician's
 * own ink (public/anatomy), not a stock illustration.
 */

export type BodyType = "female" | "male";

const ART: Record<BodyType, { src: string; w: number; h: number }> = {
  male: { src: asset("/anatomy/male.png"), w: 414, h: 1149 },
  female: { src: asset("/anatomy/female.png"), w: 368, h: 1143 },
};

/**
 * Where each anatomical view sits on the figure, as fractions of its box:
 * x across, y down, and s the spot's size relative to the default (which is
 * about a hand's width). The female figure is narrower at the shoulder, so a
 * few points move inward for her.
 */
type Spot = { x: number; y: number; s: number };
const SPOT: Record<DiagramId, Spot> = {
  head: { x: 0.5, y: 0.07, s: 1 },
  eye: { x: 0.46, y: 0.072, s: 0.5 },
  ear: { x: 0.58, y: 0.076, s: 0.45 },
  mouth: { x: 0.5, y: 0.112, s: 0.6 },
  neck: { x: 0.5, y: 0.16, s: 0.7 },
  shoulder: { x: 0.2, y: 0.2, s: 0.9 },
  heart: { x: 0.57, y: 0.285, s: 0.8 },
  lung: { x: 0.5, y: 0.3, s: 1.5 },
  abdomen: { x: 0.5, y: 0.43, s: 1.3 },
  kidney: { x: 0.5, y: 0.47, s: 1.1 },
  spine: { x: 0.5, y: 0.47, s: 1 },
  elbow: { x: 0.1, y: 0.385, s: 0.7 },
  wrist: { x: 0.06, y: 0.575, s: 0.7 },
  hip: { x: 0.33, y: 0.53, s: 0.9 },
  skin: { x: 0.9, y: 0.43, s: 0.7 },
  knee: { x: 0.4, y: 0.745, s: 0.8 },
  ankle: { x: 0.4, y: 0.95, s: 0.7 },
  body: { x: 0.5, y: 0.5, s: 2.4 },
};
const FEMALE: Partial<Record<DiagramId, Partial<Spot>>> = {
  shoulder: { x: 0.23 },
  elbow: { x: 0.13 },
  wrist: { x: 0.09 },
  skin: { x: 0.88 },
};

function spotFor(region: DiagramId, body: BodyType): Spot {
  const base = SPOT[region];
  return body === "female" ? { ...base, ...FEMALE[region] } : base;
}

/** The figure with the spot over the place. Sized by its container's height. */
export function Figure({ region, body, spot = true, searching = false }: { region: DiagramId; body: BodyType; spot?: boolean; searching?: boolean }) {
  const art = ART[body];
  const p = spotFor(region, body);
  // The default spot is a hand's width: about a third of the figure's width.
  const size = 0.34 * p.s * 100;
  return (
    <div className="relative h-full" style={{ aspectRatio: `${art.w} / ${art.h}` }}>
      <InkImage src={art.src} alt={body === "female" ? "A woman's body" : "A man's body"} className="block h-full w-full" />
      {searching && (
        <img src={SPOT_SRC} alt="" aria-hidden draggable={false} className="spot-search absolute" style={{ width: `${0.34 * 100}%` }} />
      )}
      {spot && (
        <img
          src={SPOT_SRC}
          alt=""
          aria-hidden
          draggable={false}
          className="spot absolute"
          style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, width: `${size}%`, transform: "translate(-50%, -50%)" }}
        />
      )}
    </div>
  );
}

export function BodyLocator({
  view,
  marks,
  body = "male",
  autoZoomMs = 1800,
}: {
  view: DiagramId;
  marks: string[];
  body?: BodyType;
  autoZoomMs?: number;
}) {
  const [zoomed, setZoomed] = useState(false);
  const p = spotFor(view, body);

  useEffect(() => {
    setZoomed(false);
    if (view === "body") return;
    const t = setTimeout(() => setZoomed(true), autoZoomMs);
    return () => clearTimeout(t);
  }, [view, autoZoomMs]);

  // Scale the figure around the spot so it flies toward the viewer while the
  // detail fades in over it.
  const origin = `${p.x * 100}% ${p.y * 100}%`;

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); if (view !== "body") setZoomed((z) => !z); }}
      className="relative w-full overflow-hidden text-left"
      style={{ aspectRatio: "1 / 1" }}
      aria-label={zoomed ? "Show the whole body" : "Zoom in"}
    >
      <div
        className="absolute inset-0 flex items-center justify-center p-4 transition-all duration-700 ease-out motion-reduce:transition-none"
        style={{
          transformOrigin: origin,
          transform: zoomed ? "scale(3.2)" : "scale(1)",
          opacity: zoomed ? 0 : 1,
        }}
      >
        <div key={body} className="h-full flex items-center justify-center rise">
          <Figure region={view} body={body} />
        </div>
      </div>
      <div
        className="absolute inset-0 flex items-center justify-center p-6 transition-all duration-700 ease-out motion-reduce:transition-none"
        style={{ transform: zoomed ? "scale(1)" : "scale(0.6)", opacity: zoomed ? 1 : 0 }}
      >
        <div className="h-full w-full flex items-center justify-center">
          <Diagram id={view} marks={marks} fit />
        </div>
      </div>
      <span className="absolute bottom-3 right-3 meta-chip no-print">
        {zoomed ? "Tap to see the whole body" : "Zooming in…"}
      </span>
    </button>
  );
}
