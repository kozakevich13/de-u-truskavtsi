import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: {
    default: "Трускавець: Карта закладів, кав'ярень та відпочинку",
    template: "%s | Відкривай Трускавець" 
  },
  description: "Знайдіть найкращі кав'ярні, ресторани та готелі у Трускавці. Актуальна карта міста з графіком роботи, фото та відгуками.",
  
  openGraph: {
    title: "Відкривай Трускавець — Твій путівник містом",
    description: "Всі цікаві локації Трускавця в одному місці: від кав'ярень до бюветів.",
    url: "https://detruckavtsi.info",
    siteName: "Відкривай Трускавець",
    locale: "uk_UA",
    type: "website",
    images: [
      {
        url: "/og-main.jpg",
        width: 1200,
        height: 630,
        alt: "Карта Трускавця",
      },
    ],
  },
  
  twitter: {
    card: "summary_large_image",
    title: "Відкривай Трускавець",
    description: "Найкращі заклади Трускавця на одній карті.",
    images: ["/og-main.jpg"],
  },

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk"> 
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning={true}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}