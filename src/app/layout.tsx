import React from 'react'
import type { Metadata } from "next";
import Header from '@/components/Header';
import DevBanner from '@/components/DevBanner';
import ExtensionBridge from './extension-bridge';
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://classlogger.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ClassLogger — Automatic Class Tracking & Logs for Online Tutors",
    template: "%s | ClassLogger",
  },
  description:
    "ClassLogger auto-tracks your Google Meet classes, manages parent credits, and shares transparent class logs with parents. Free class tracking for online tutors and tuition teachers.",
  keywords: [
    "class tracking software", "online tutoring", "tuition class log",
    "Google Meet class tracker", "tutor attendance", "class management for teachers",
    "parent class reports", "online tuition credits", "class logger",
  ],
  authors: [{ name: "ClassLogger" }],
  creator: "ClassLogger",
  publisher: "ClassLogger",
  robots: {
    index: true, follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website", locale: "en_IN", url: SITE_URL, siteName: "ClassLogger",
    title: "ClassLogger — Automatic Class Tracking for Online Tutors",
    description:
      "Auto-track Google Meet classes, manage credits, and share transparent logs with parents.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClassLogger — Automatic Class Tracking for Online Tutors",
    description: "Auto-track classes, manage credits, share transparent logs with parents.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "ClassLogger",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      description:
        "Automatic class tracking for online tutors: logs Google Meet sessions, manages parent credits, and shares transparent class logs with parents.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    },
    {
      "@type": "Organization",
      name: "ClassLogger",
      url: SITE_URL,
      description: "Transparent class logs and class tracking for parents & teachers.",
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: "What is ClassLogger?", acceptedAnswer: { "@type": "Answer", text: "ClassLogger is a tool for online tutors that automatically tracks Google Meet classes, manages parent credit balances, and shares transparent class logs with parents." } },
        { "@type": "Question", name: "How does ClassLogger track classes?", acceptedAnswer: { "@type": "Answer", text: "Classes can be tracked automatically via a browser extension or logged from the website with a floating widget or manual entry. Each class records duration, screenshots, and notes." } },
        { "@type": "Question", name: "Do I need to install anything?", acceptedAnswer: { "@type": "Answer", text: "No. ClassLogger works entirely from the website with a floating logger. A Chrome extension is optional for automatic Google Meet detection and screenshots." } },
        { "@type": "Question", name: "How do parents see class logs?", acceptedAnswer: { "@type": "Answer", text: "Teachers share a secure link. Parents open a monthly class log or a per-class summary with screenshots, topics, and duration — no login required." } },
        { "@type": "Question", name: "How do credits work?", acceptedAnswer: { "@type": "Answer", text: "Parents buy credit hours shared across their children with a teacher. Credits are deducted automatically when a class ends." } },
        { "@type": "Question", name: "Is ClassLogger free?", acceptedAnswer: { "@type": "Answer", text: "Yes, teachers can start logging classes for free." } },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Font loading via CDN - fixes Turbopack issue */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&family=JetBrains+Mono:wght@100;200;300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />

        {/* Meticulous.ai Script - Must be first script to load */}
        {(process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") && (
          // eslint-disable-next-line @next/next/no-sync-scripts
          <script
            data-recording-token="LJdHGEzkbQDWiwtVPXMfiW0dGfRvymh5TUNtzWVg"
            data-is-production-environment="false"
            src="https://snippet.meticulous.ai/v1/meticulous.js"
          />
        )}
      </head>
      <body
        className="font-sans antialiased"
        style={{
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        }}
        suppressHydrationWarning={true}
      >

        <DevBanner />
        <Header />
        <ExtensionBridge />
        <SpeedInsights />
        <Analytics />
        <main className="min-h-screen">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-gray-50 border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between">
              <div className="flex items-center space-x-2 mb-2 sm:mb-0">
                <div className="p-2 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1v6m0 6v6" />
                  </svg>
                </div>
                <span className="text-sm text-gray-600">© 2025 ClassLogger. All rights reserved.</span>
              </div>
              <p className="text-xs text-gray-500">
                Transparent class logs for parents & teachers
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}