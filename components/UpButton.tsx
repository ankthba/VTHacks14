"use client";

import { useEffect, useState } from "react";
import { InkArrow } from "@/components/Ink";

/** Appears once the page has scrolled a way; takes you back to the top. */
export function UpButton() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <a href="#top" className={`up-link no-print ${show ? "show" : ""}`} aria-label="Back to the top">
      <InkArrow className="-rotate-90" /> Up
    </a>
  );
}
