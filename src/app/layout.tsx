/*
 * Root Layout Component
 * 
 * This is the main layout wrapper for the entire Next.js application.
 * It sets up:
 * - HTML structure and language
 * - Font configuration (Inter from Google Fonts)
 * - Global styles and CSS
 * - Metadata for SEO
 * 
 * Customization Guide:
 * 1. Font: Change `Inter` to any Google Font or custom font
 * 2. Metadata: Update title and description for your brand
 * 3. Global styles: Modify globals.css for theme customization
 * 4. Add providers here (e.g., theme providers, analytics)
 *
 * @example
 * // To add a theme provider:
 * import { ThemeProvider } from '@/components/theme-provider'
 *
 * // Wrap children with:
 * <ThemeProvider>
 *   {children}
 * </ThemeProvider>
 */

import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Toaster } from 'sonner';
// import { PWAManager } from '@/components/pwa/PWAManager'; // Disabled - Uncomment to enable PWA install prompts
import { DemoModeProvider } from '@/components/demo/DemoModeProvider';
import { PostHogProvider } from '@/components/PostHogProvider';
import { GoogleAnalytics, GTMNoScript } from '@/components/GoogleAnalytics';
import "./globals.css";

/**
 * Font Configuration
 * 
 * Using Inter as the default font for clean, modern typography.
 * The font is loaded from Google Fonts and optimized by Next.js.
 * 
 * To change the font:
 * 1. Import a different font from 'next/font/google'
 * 2. Update the variable name (used in CSS as var(--font-inter))
 * 3. Update the className in the body tag
 * 
 * @example
 * // Using Roboto instead:
 * import { Roboto } from "next/font/google";
 * const roboto = Roboto({
 *   variable: "--font-roboto",
 *   subsets: ["latin"],
 *   weight: ["400", "500", "700"],
 * });
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

/**
 * Page Metadata
 * 
 * SEO and browser metadata for the application.
 * This appears in search results and browser tabs.
 * 
 * Customization:
 * - title: Your application name
 * - description: Brief description for search engines
 * - Add more metadata fields as needed:
 *   - keywords: ["chat", "ai", "customgpt"]
 *   - authors: [{ name: "Your Name" }]
 *   - openGraph: { ... } for social sharing
 *   - twitter: { ... } for Twitter cards
 * 
 * @see https://nextjs.org/docs/app/api-reference/functions/generate-metadata
 */
export const metadata: Metadata = {
  title: "Coach Connect Admin",
  description: "Admin dashboard for Coach Connect - powered by CustomGPT.ai",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    apple: "/icons/icon-192x192.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Coach Connect",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Coach Connect",
    "application-name": "Coach Connect",
    "msapplication-TileColor": "#C9A227",
    "msapplication-tap-highlight": "no",
    "theme-color": "#C9A227",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

/**
 * Root Layout Component
 * 
 * This component wraps all pages in the application.
 * It's the perfect place to add:
 * - Global providers (theme, authentication, etc.)
 * - Analytics scripts
 * - Global error boundaries
 * - Toast notifications
 * - Modal portals
 * 
 * Body Classes:
 * - font-sans: Uses the system sans-serif font stack
 * - antialiased: Improves font rendering
 * - inter.variable: Makes the Inter font available as CSS variable
 * 
 * @param children - Page content to render
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics - GTM & GA4 */}
        <GoogleAnalytics />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Prevent flash of incorrect theme on page load using cookies
              (function() {
                try {
                  // Get theme from cookie
                  const cookies = document.cookie.split(';');
                  const themeCookie = cookies.find(cookie =>
                    cookie.trim().startsWith('customgpt-theme=')
                  );

                  let theme = 'light';

                  if (themeCookie) {
                    theme = themeCookie.split('=')[1].trim();
                  } else {
                    // Fallback to localStorage for backward compatibility
                    const stored = localStorage.getItem('customgpt-config');
                    if (stored) {
                      const parsed = JSON.parse(stored);
                      theme = parsed?.state?.theme || 'light';

                      // Migrate to cookie
                      document.cookie = 'customgpt-theme=' + theme + '; max-age=' + (365 * 24 * 60 * 60) + '; path=/; SameSite=Lax';
                    }
                  }

                  // Apply theme
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {
                  // Default to light theme if there's an error
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        {/* GTM NoScript Fallback */}
        <noscript>
          <GTMNoScript />
        </noscript>
        {/* Add global providers here */}
        <PostHogProvider>
          <DemoModeProvider>
            {children}
            {/* PWA Manager for install prompts and updates - DISABLED 
                Uncomment the line below to enable PWA install prompts
                <PWAManager />
            */}
            {/* Global toast notifications with close button */}
            <Toaster 
              position="top-center" 
              closeButton
              richColors
              gap={8}
              toastOptions={{
                style: {
                  marginTop: '8px'
                }
              }}
            />
          </DemoModeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}