/** @type {import('next').NextConfig} */
const nextConfig = {
  // Suppress build warnings
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: false,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: false,
  },
  webpack: (config, { isServer }) => {
    // Handle the onnxruntime-web warning
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // Ignore the critical dependency warning from onnxruntime-web
    config.module.exprContextCritical = false;

    // Suppress webpack warnings for onnxruntime-web
    config.ignoreWarnings = [
      {
        module: /onnxruntime-web/,
        message: /Critical dependency/,
      },
    ];

    // Add WASM support for VAD
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    return config;
  },
  
  // Add proper headers for ONNX, WASM, and Audio Worklet files
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://customgpt.ai https://*.customgpt.ai https://futureproof.work https://*.futureproof.work http://localhost:* http://127.0.0.1:*",
          },
        ],
      },
      {
        source: '/(.*\\.onnx|.*\\.wasm)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'cross-origin',
          },
          {
            key: 'Cross-Origin-Opener-Policy', 
            value: 'same-origin',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Content-Type',
            value: 'application/octet-stream',
          },
        ],
      },
      {
        source: '/(.*worklet.*\\.js)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'cross-origin',
          },
          {
            key: 'Cross-Origin-Opener-Policy', 
            value: 'same-origin',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
  
  // Ensure static files are served correctly and add PostHog rewrites
  async rewrites() {
    return [
      {
        source: '/_next/static/chunks/:path*',
        destination: '/:path*',
      },
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ];
  },

  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

module.exports = nextConfig;
