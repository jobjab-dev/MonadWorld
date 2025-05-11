import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Monad World",
  description: "MonadWorld - A Pixel Adventure on Monad!", // Updated description
  viewport: 'width=device-width, initial-scale=1', // Added viewport meta tag
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
