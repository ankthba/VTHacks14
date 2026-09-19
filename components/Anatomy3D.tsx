"use client";

import { useState } from "react";
import { MODELS, embedUrl, modelPageUrl } from "@/lib/anatomy/models";
import type { DiagramId } from "@/lib/anatomy/conditions";

/** An interactive 3D model the patient can turn, with its licence attribution. */
export function Anatomy3D({ view, className }: { view: DiagramId; className?: string }) {
  const m = MODELS[view];
  const [loaded, setLoaded] = useState(false);

  return (
    <figure className={className}>
      <div
        className="relative w-full rounded-2xl overflow-hidden border border-[color:var(--line-soft)]"
        style={{ aspectRatio: "4 / 3", background: "var(--surface-warm)" }}
      >
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-[color:var(--muted)]">
            Loading the 3D model&hellip;
          </div>
        )}
        <iframe
          title={`${m.title} - interactive 3D model`}
          src={embedUrl(m.uid)}
          className="absolute inset-0 w-full h-full"
          allow="autoplay; fullscreen; xr-spatial-tracking"
          allowFullScreen
          onLoad={() => setLoaded(true)}
        />
      </div>
      <figcaption className="text-xs text-[color:var(--muted)] mt-2">
        Drag to turn it. 3D model:{" "}
        <a href={modelPageUrl(m.uid)} target="_blank" rel="noopener noreferrer" className="underline">
          {m.title}
        </a>{" "}
        by {m.author} on Sketchfab, {m.license}.
      </figcaption>
    </figure>
  );
}
