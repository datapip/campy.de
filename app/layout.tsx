import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Ziel-URL Generator",
  description: "Interner Generator für Kampagnen-Tracking-URLs",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen bg-muted/40 text-foreground">
        {children}
      </body>
    </html>
  );
}
