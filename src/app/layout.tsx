import type { Metadata, Viewport } from "next"; 
import { Nunito } from "next/font/google"; 
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"
import Header from "./components/Header";

const nunito = Nunito({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"], 
  variable: "--font-nunito", 
  display: "swap", 
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" }, 
  ],
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://detruckavtsi.info"),
  title: {
    default: "Трускавець: Карта закладів, кав'ярень та відпочинку",
    template: "%s | Відкривай Трускавець" 
  },
  description: "Знайдіть найкращі кав'ярні, ресторани та готелі у Трускавці. Актуальна карта міста з графіком роботи, фото та відгуками.",
  
  icons: {
    icon: [
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/icon.png',
    apple: '/apple-touch-icon.png',
  },

  verification: {
    google: '1rZgcAprm3LxHURfV6gzN4bEN4e2yh0SzHmcqDaqZUg',
  },
  robots: {
    index: true,
    follow: true,
  },

  openGraph: {
    title: "Відкривай Трускавець — Твій путівник містом",
    description: "Всі цікаві локації Трускавця в одному місці: від кав'ярень до бюветів.",
    url: "https://detruckavtsi.info",
    siteName: "Відкривай Трускавець",
    locale: "uk_UA",
    type: "website",
    images: [
      {
        url: "/og-main.png", 
        width: 1200,
        height: 630,
        alt: "Карта закладів Трускавця",
      },
    ],
  },
  
  twitter: {
    card: "summary_large_image",
    title: "Відкривай Трускавець",
    description: "Найкращі заклади Трускавця на одній карті.",
    images: ["/og-main.png"], 
  },

  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk"> 
      <body
        className={`${nunito.className} antialiased`}
        suppressHydrationWarning={true}
      >
        <Header />
        {children}
        <Analytics />
      </body>
    </html>
  );
}