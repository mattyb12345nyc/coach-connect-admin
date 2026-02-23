/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Theme-aware colors using CSS variables
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        popover: 'var(--popover)',
        'popover-foreground': 'var(--popover-foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        'primary-hover': 'var(--primary-hover)',
        'primary-active': 'var(--primary-active)',
        'primary-light': 'var(--primary-light)',
        secondary: 'var(--secondary)',
        'secondary-foreground': 'var(--secondary-foreground)',
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
        destructive: 'var(--destructive)',
        'destructive-foreground': 'var(--destructive-foreground)',
        success: 'var(--success)',
        'success-foreground': 'var(--success-foreground)',
        warning: 'var(--warning)',
        'warning-foreground': 'var(--warning-foreground)',
        
        // Chat-specific theme-aware colors
        'chat-user-bg': 'var(--chat-user-bg)',
        'chat-user-text': 'var(--chat-user-text)',
        'chat-assistant-bg': 'var(--chat-assistant-bg)',
        'chat-assistant-text': 'var(--chat-assistant-text)',
        'chat-border': 'var(--chat-border)',
        'chat-hover': 'var(--chat-hover)',
        
        // Sidebar theme-aware colors
        'sidebar-bg': 'var(--sidebar-bg)',
        'sidebar-foreground': 'var(--sidebar-foreground)',
        'sidebar-border': 'var(--sidebar-border)',
        'sidebar-hover': 'var(--sidebar-hover)',
        
        // Coach Brand Colors
        'coach-black': '#1C1917',
        'coach-cream': '#F5F0EB',
        'coach-gold': '#C9A227',
        'coach-brown': '#8B7355',
        'coach-mahogany': '#5c3d2e',
        'coach-champagne': '#e8dfd0',
        
        // Landing page specific colors
        'landing-bg': '#FFFFFF',
        'landing-surface': '#F8F9FA',
        'landing-surface-light': '#E5E7EB',
        'landing-text': '#111827',
        'landing-text-secondary': '#6B7280',
        'landing-terminal-green': '#00FF00',
        
        // Keep existing brand colors for other components
        brand: {
          50: '#f0f7ff',
          100: '#e0efff',  
          200: '#b8d9ff',
          300: '#7ab8ff',
          400: '#3394ff',
          500: '#0a75ff',
          600: '#0058e6',
          700: '#0044ba',
          800: '#003896',
          900: '#002d7a',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
        mono: ['Fira Code', 'Monaco', 'Consolas', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'blink': 'blink 1s infinite',
        'bounce-subtle': 'bounceSubtle 1.4s infinite',
        'voice-pulse': 'voicePulse 0.8s ease-in-out infinite',
        'wave': 'wave 1s ease-in-out infinite',
        'gradient-x': 'gradient-x 3s ease infinite',
        'float': 'float 2s ease-in-out infinite',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        blink: {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
        bounceSubtle: {
          '0%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-6px)' },
        },
        voicePulse: {
          '0%, 100%': { transform: 'scaleY(0.5)' },
          '50%': { transform: 'scaleY(1)' },
        },
        wave: {
          '0%, 100%': { transform: 'scaleY(1)' },
          '50%': { transform: 'scaleY(1.5)' },
        },
        'gradient-x': {
          '0%, 100%': { transform: 'translateX(0%)' },
          '50%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
  darkMode: 'class',
};