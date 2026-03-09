'use client'

import { useState } from 'react'
import { ReactIcon, NextjsIcon, VueIcon, AngularIcon } from './icons'

const codeExamples = {
  react: {
    title: 'React Component Integration',
    code: `import { CustomGPT.aiWidget } from '@customgpt/react';

function App() {
  return (
    <CustomGPT.aiWidget
      apiKey={process.env.REACT_APP_CUSTOMGPT_KEY}
      agentId="your-agent-id"
      theme="dark"
      position="bottom-right"
      enableVoice={true}
      onMessage={(msg) => console.log(msg)}
    />
  );
}`
  },
  nextjs: {
    title: 'Next.js Integration',
    code: `// pages/api/customgpt/[...path].js
export default function handler(req, res) {
  // Proxy to CustomGPT.ai API with server-side auth
  const response = await fetch(\`\${CUSTOMGPT_API}/\${path}\`, {
    headers: { 'Authorization': \`Bearer \${API_KEY}\` }
  });
  res.json(await response.json());
}

// components/ChatWidget.js
<CustomGPT.aiChat 
  apiEndpoint="/api/customgpt"
  agentId={process.env.AGENT_ID}
/>`
  },
  html: {
    title: 'HTML/JS Integration',
    code: `<script src="https://cdn.customgpt.ai/widget.js"></script>
<script>
  CustomGPT.aiWidget.init({
    apiKey: process.env.CUSTOMGPT_API_KEY,
    agentId: 'your-agent-id',
    theme: 'light',
    position: 'bottom-right',
    primaryColor: '#EE55FF'
  });
</script>`
  },
  wordpress: {
    title: 'WordPress Integration',
    code: `// Add to functions.php
function add_customgpt_widget() {
  wp_enqueue_script('customgpt-widget', 
    'https://cdn.customgpt.ai/widget.js', [], '1.0', true);
}
add_action('wp_enqueue_scripts', 'add_customgpt_widget');

// Shortcode usage
[customgpt agent_id="your-id" theme="dark"]`
  },
  vue: {
    title: 'Vue.js Integration', 
    code: `<template>
  <CustomGPT.aiWidget 
    :agent-id="agentId"
    :theme="theme"
    :enable-voice="true"
    @message="handleMessage"
  />
</template>

<script>
import { CustomGPT.aiWidget } from '@customgpt/vue'

export default {
  components: { CustomGPT.aiWidget },
  data: () => ({
    agentId: process.env.VUE_APP_AGENT_ID,
    theme: 'dark'
  })
}
</script>`
  },
  angular: {
    title: 'Angular Integration',
    code: `// app.component.ts
import { Component } from '@angular/core';
import { CustomGPT.aiService } from '@customgpt/angular';

@Component({
  selector: 'app-root',
  template: \`
    <customgpt-widget 
      [agentId]="agentId"
      [theme]="theme"
      (onMessage)="handleMessage($event)">
    </customgpt-widget>
  \`
})
export class AppComponent {
  agentId = environment.customgptAgentId;
  theme = 'dark';
}`
  }
}

export function CodeExamplesSection() {
  const [activeTab, setActiveTab] = useState('react')
  const [isCopied, setIsCopied] = useState(false)
  const currentExample = codeExamples[activeTab as keyof typeof codeExamples]
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentExample.code)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }
  
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-landing-text mb-4">
            Integration Examples
          </h2>
          <p className="text-lg sm:text-xl text-landing-text-secondary max-w-3xl mx-auto">
            Copy, paste, customize - it&apos;s that simple. Works with every popular framework.
          </p>
        </div>
        
        {/* Framework Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 border-b border-landing-surface-light">
          {Object.entries(codeExamples).map(([key, example]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-6 py-3 font-medium transition-all duration-200 border-b-3 flex items-center gap-2 ${
                activeTab === key
                  ? 'text-customgpt-primary border-customgpt-primary'
                  : 'text-landing-text-secondary border-transparent hover:text-customgpt-primary hover:border-customgpt-primary/50'
              }`}
            >
              {key === 'react' ? (
                <>
                  <ReactIcon size={20} className="fill-current" />
                  React
                </>
              ) : key === 'nextjs' ? (
                <>
                  <NextjsIcon size={20} className="fill-current" />
                  Next.js
                </>
              ) : key === 'vue' ? (
                <>
                  <VueIcon size={20} className="fill-current" />
                  Vue
                </>
              ) : key === 'angular' ? (
                <>
                  <AngularIcon size={20} className="fill-current" />
                  Angular
                </>
              ) : key === 'html' ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,17.56L16.07,16.43L16.62,10.33H9.38L9.2,8.3H16.8L17,6.31H7L7.56,12.32H14.45L14.22,14.9L12,15.5L9.78,14.9L9.64,13.24H7.64L7.93,16.43L12,17.56M4.07,3H19.93L18.5,19.2L12,21L5.5,19.2L4.07,3Z" />
                  </svg>
                  HTML/JS
                </>
              ) : key === 'wordpress' ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M3.75,12C3.75,7.09 7.09,3.12 11.77,2.56V2.83C10.54,3.07 9.5,3.65 8.64,4.56C7.84,5.41 7.23,6.54 6.82,7.96L4.68,15.54C4.06,14.43 3.75,13.25 3.75,12M12,20.25C10.81,20.25 9.64,19.97 8.57,19.42L10.5,13.17L14.5,3.73C14.74,3.11 15.09,2.8 15.54,2.8C15.8,2.8 16.06,2.85 16.32,2.96L16.36,2.97C13.87,3.31 11.78,4.71 10.29,6.65C9,8.28 8.35,10.34 8.35,12.35C8.35,14 8.87,15.78 9.87,17.23C10.86,18.66 12.09,19.67 13.57,20.19C13.05,20.22 12.53,20.25 12,20.25M16.83,19.74L14.59,13.79L13.34,17.76C12.8,19.36 12.24,20.16 11.65,20.16C11.42,20.16 11.22,20.09 11.05,19.95C13.12,19.45 14.95,18.17 16.23,16.26C17.31,14.59 17.85,12.67 17.85,10.61C17.85,10.04 17.81,9.47 17.73,8.91C17.64,8.34 17.5,7.78 17.32,7.23C17.56,7.23 17.78,7.3 18,7.42L18.43,9.84L20.25,16.37C18.86,18.11 17.92,19.22 16.83,19.74Z" />
                  </svg>
                  WordPress
                </>
              ) : (
                key.charAt(0).toUpperCase() + key.slice(1)
              )}
            </button>
          ))}
        </div>
        
        {/* Code Container */}
        <div className="bg-black rounded-2xl p-6 relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800">
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span className="text-gray-400 text-sm font-medium">
                {currentExample.title}
              </span>
            </div>
            <button
              onClick={copyToClipboard}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                isCopied 
                  ? 'bg-green-500 text-white' 
                  : 'bg-customgpt-primary text-white hover:bg-customgpt-secondary'
              }`}
            >
              <span className={`inline-flex items-center gap-2 transition-all duration-300 ${
                isCopied ? 'opacity-100' : 'opacity-100'
              }`}>
                {isCopied ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Copy Code
                  </>
                )}
              </span>
            </button>
          </div>
          
          {/* Code Content */}
          <pre className="text-customgpt-accent font-mono text-sm leading-relaxed overflow-x-auto">
            <code>{currentExample.code}</code>
          </pre>
        </div>
        
        {/* View More Examples Link */}
        <div className="mt-8 text-center">
          <a 
            href="https://github.com/Poll-The-People/customgpt-starter-kit/tree/main/examples?utm_source=starterkit.customgpt.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-customgpt-primary hover:text-customgpt-secondary font-medium transition-colors"
          >
            <span>View more {currentExample.title.split(' ')[0]} examples</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17L17 7M17 7H7M17 7V17" />
            </svg>
          </a>
        </div>
        
        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <div className="bg-landing-surface rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-landing-text mb-4">
              Need Help with Integration?
            </h3>
            <p className="text-landing-text-secondary mb-6 max-w-2xl mx-auto">
              Our documentation includes step-by-step guides for every framework, 
              plus video tutorials and live examples.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="https://docs.customgpt.ai/reference/full-fledged-chat-ui-with-project-settings?utm_source=starterkit.customgpt.ai" target="_blank" rel="noopener noreferrer" className="bg-gradient-to-r from-customgpt-primary to-customgpt-secondary text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-customgpt-primary/25 hover:-translate-y-0.5 transition-all duration-200">
                View Documentation
              </a>
              <a href="https://www.youtube.com/playlist?list=PLqm0evVmDZ_2ErSA69P4o68h5ZdYDF0jF&utm_source=starterkit.customgpt.ai" target="_blank" rel="noopener noreferrer" className="bg-white border-2 border-customgpt-primary text-customgpt-primary px-8 py-3 rounded-lg font-semibold hover:bg-customgpt-primary hover:text-white hover:-translate-y-0.5 transition-all duration-200">
                Watch Tutorials
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}