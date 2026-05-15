import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeApplier } from "@/components/shell/ThemeApplier";
import { SeedOnEmpty } from "@/components/shell/SeedOnEmpty";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Zlate",
  description: "A visual project tracker for indie developers.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeApplier />
        <SeedOnEmpty />
        {children}
      </body>
    </html>
  );
}
