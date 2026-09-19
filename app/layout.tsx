import type { Metadata } from "next";
import { Lora, Figtree } from "next/font/google";
import "./globals.css";
import { APP_NAME, APP_DESCRIPTION, APP_TAGLINE } from "@/lib/brand";

/* Lora for headlines: a warm, calligraphic serif that stays readable at the
   sizes an older patient reads. Figtree for everything else: friendly, open,
   and it does not look like a code editor. */
const display = Lora({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
});
const body = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
  weight: "variable",
});
export const metadata: Metadata = {
  title: `${APP_NAME} - ${APP_TAGLINE}`,
  description: APP_DESCRIPTION,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/*
          The disclaimer is in the root layout, not a component someone can
          forget to include. It is on every screen and on every printout.
        */}
        <div
          role="note"
          className="w-full text-center px-4 py-1.5 text-[12px] tracking-wide"
          style={{ background: "var(--surface-warm)", color: "var(--muted)", borderBottom: "1px solid var(--line-soft)" }}
        >
          Educational demo. Not medical advice. Always confirm with your
          pharmacist or physician.
        </div>
        {children}
      </body>
    </html>
  );
}
