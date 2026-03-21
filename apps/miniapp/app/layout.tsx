import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Manrope } from "next/font/google";
import { TelegramInit } from "@/components/telegram-init";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Medsearch Mini App",
  description: "Telegram Mini App для поиска врачей Минска",
  authors: [{ name: "Nikita", url: "https://t.me/AI_Nikitka93" }],
  creator: "AI_Nikitka93",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${inter.variable} ${manrope.variable} h-full`}>
      <body className="min-h-full bg-page text-text antialiased">
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="afterInteractive"
        />
        <TelegramInit />
        {children}
      </body>
    </html>
  );
}
