import type { Metadata } from "next";
import "./globals.css";
import AppHeader from "./components/AppHeader";
import ToastProvider from "./components/ToastProvider";

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
    <html lang="it">
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
