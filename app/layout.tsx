import type { Metadata } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import "./globals.css";
import { APP_NAME, APP_DESCRIPTION, APP_TAGLINE } from "@/lib/brand";

/* Fraunces is a soft serif with an optical-size axis and a "wonk" - it reads
   handmade rather than editorial. Nunito Sans has rounded terminals and stays
   very legible at the sizes an older patient reads. */
const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "variable",
  axes: ["SOFT", "WONK", "opsz"],
});
const body = Nunito_Sans({
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
          className="w-full text-center px-4 py-2 text-sm font-medium"
          style={{ background: "var(--foreground-deep)", color: "var(--on-dark)" }}
        >
          Educational demo. Not medical advice. Always confirm with your
          pharmacist or physician.
        </div>
        {children}
      </body>
    </html>
  );
}
