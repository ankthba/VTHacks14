import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";

/* Stand-ins for Granola's licensed quadrant/melange: a display serif used at
   regular weight, paired with a neutral sans from the same family. */
const display = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});
const body = Instrument_Sans({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PillPile - medication reconciliation from a photo",
  description:
    "Photograph your pill bottles and get a plain-language sheet of questions to ask your pharmacist. Educational demo, not medical advice.",
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
          className="w-full text-center px-4 py-2 text-sm font-medium"
          style={{ background: "var(--foreground-deep)", color: "var(--accent-ink)" }}
        >
          Educational demo. Not medical advice. Always confirm with your
          pharmacist or physician.
        </div>
        {children}
      </body>
    </html>
  );
}
