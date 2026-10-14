import type { Metadata } from "next";
import { Bodoni_Moda, Crimson_Pro, Nunito_Sans, Oswald } from "next/font/google";
import "./globals.css";
import AppHeader from "./components/AppHeader";
import ToastProvider from "./components/ToastProvider";

const bodoni = Bodoni_Moda({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-bodoni", display: "swap" });
const crimson = Crimson_Pro({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-crimson", display: "swap" });
const oswald = Oswald({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-oswald", display: "swap" });
const nunito = Nunito_Sans({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });

export const metadata: Metadata = {
  title: "Pentagramma",
  description: "Gestione lezioni e calendario",
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${bodoni.variable} ${crimson.variable} ${oswald.variable} ${nunito.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#bc4e31" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen">
        <ToastProvider>
          <AppHeader />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
