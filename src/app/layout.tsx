import type { Metadata, Viewport } from "next"; 
import { Geist, Geist_Mono, Montserrat } from "next/font/google"; 
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"

const montserrat = Montserrat({
  subsets: ["cyrillic", "cyrillic-ext", "latin"],
  weight: ["400", "500", "600", "700", "800"], 
  variable: "--font-montserrat", 
  display: "swap", 
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
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
    icon: '/favicon.ico',
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
    images: ["/og-main.jpg"],
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
        className={`${montserrat.className} ${geistSans.variable} ${geistMono.variable} antialiased`} 
        suppressHydrationWarning={true}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}