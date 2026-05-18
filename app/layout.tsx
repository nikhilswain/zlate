import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeApplier } from "@/components/shell/ThemeApplier";

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
  const bootScript = `
(function(){try{
  var d=document.documentElement;
  var mq=window.matchMedia('(max-width: 767px)');
  d.dataset.vp=mq.matches?'mobile':'desktop';
  var t=localStorage.getItem('zlate.theme');
  if(t==='light'||t==='dark') d.dataset.theme=t;
}catch(e){}})();
`.trim();
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="zlate-boot" strategy="beforeInteractive">
          {bootScript}
        </Script>
        <ThemeApplier />
        {children}
      </body>
    </html>
  );
}
