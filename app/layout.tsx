import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PillPile - medication reconciliation from a photo",
  description:
    "Photograph your pill bottles and get a plain-language sheet of questions to ask your pharmacist. Educational demo, not medical advice.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/*
          The disclaimer is in the root layout, not a component someone can
          forget to include. It is on every screen and on every printout.
        */}
        <div
          role="note"
          className="w-full bg-[#141414] text-white text-center px-4 py-2 text-sm font-medium"
        >
          Educational demo. Not medical advice. Always confirm with your
          pharmacist or physician.
        </div>
        {children}
      </body>
    </html>
  );
}
