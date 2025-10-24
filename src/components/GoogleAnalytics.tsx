'use client';

import Script from 'next/script';

const isProduction = process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'production';

/**
 * Google Analytics Component
 *
 * Integrates both Google Tag Manager (GTM) and Google Analytics 4 (GA4)
 * for comprehensive analytics tracking.
 *
 * IDs:
 * - GTM Container: GTM-W2BS4MV
 * - GA4 Measurement: G-DE578B4ZFX
 * - GA4 Tag: GT-NF7JGWB
 */
export function GoogleAnalytics() {
  const GTM_ID = 'GTM-W2BS4MV';
  const GA4_MEASUREMENT_ID = 'G-DE578B4ZFX';

  if (!isProduction) {
    return null;
  }

  return (
    <>
      {/* Google Tag Manager */}
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM_ID}');
          `,
        }}
      />

      {/* Google Analytics 4 */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script
        id="ga4-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA4_MEASUREMENT_ID}');
          `,
        }}
      />
    </>
  );
}

/**
 * GTM NoScript Fallback
 *
 * This should be placed in the <body> tag for users with JavaScript disabled.
 * Add this to your layout.tsx body:
 *
 * <noscript>
 *   <GTMNoScript />
 * </noscript>
 */
export function GTMNoScript() {
  const GTM_ID = 'GTM-W2BS4MV';

  if (!isProduction) {
    return null;
  }

  return (
    <iframe
      src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
      height="0"
      width="0"
      style={{ display: 'none', visibility: 'hidden' }}
    />
  );
}
