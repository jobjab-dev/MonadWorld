import type { Metadata, Viewport } from "next";
// import { Geist, Geist_Mono } from "next/font/google"; // Previous fonts
import { Pixelify_Sans } from "next/font/google"; // New Pixel font
import "./globals.css";
import Providers from '@/components/providers'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'; // Added import for Footer

// Configure Pixelify Sans
const pixelifySans = Pixelify_Sans({
  subsets: ['latin'],
  variable: '--font-pixelify-sans', // CSS variable name
  weight: ['400', '500', '600', '700'] // Choose weights you need
});

// Update or define these metadata constants
const siteTitle = "MonadWorld - Collect, Earn, Compete!";
const siteDescription = "Dive into MonadWorld, collect unique Lilnad NFTs, accrue scores, and compete for rewards in a vibrant pixel art ecosystem on the Monad blockchain.";
const siteUrl = process.env.NODE_ENV === 'production' ? "https://www.monadworld.xyz" : "http://localhost:3000"; // Dynamic siteUrl
const socialImage = `${siteUrl}/logo.png`; // Using the logo file for social sharing

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  icons: [
    { rel: 'icon', url: '/favicon.ico' },
    { rel: 'icon', url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    { rel: 'icon', url: '/favicon.svg', type: 'image/svg+xml' },
    { rel: 'apple-touch-icon', url: '/apple-touch-icon.png' },
    { rel: 'shortcut icon', url: '/favicon.ico' },
  ],
  manifest: "/site.webmanifest",
  appleWebApp: {
    title: "MonadWorld",
    statusBarStyle: "default",
    capable: true,
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: siteTitle,
    description: siteDescription,
    siteName: "MonadWorld",
    images: [
      {
        url: socialImage,
        width: 1200,
        height: 630,
        alt: "MonadWorld - Pixel Art NFT Ecosystem",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [socialImage],
    creator: "@MonadWorld",
  },
  other: {
    "telegram:channel": "@MonadWorld",
  },
};

// Added generateViewport function
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: "#482880", // Example theme color from your palette
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${pixelifySans.variable} antialiased`}
      >
        <Providers>
          <div className="flex flex-col min-h-screen">
            <Navbar /> 
            <main className="flex-grow overflow-y-auto">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
