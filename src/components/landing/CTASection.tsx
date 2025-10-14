'use client'

import { RocketIcon, GitHubIcon, BookIcon, TargetIcon, DiscordIcon, RocketChatIcon } from './icons'

export function CTASection() {
  return (
    <section className="py-24 bg-landing-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-landing-text mb-6">
            Ready to Build Something{' '}
            <span className="bg-gradient-to-r from-customgpt-primary to-customgpt-secondary bg-clip-text text-transparent">
              Amazing?
            </span>
          </h2>
          
          <p className="text-lg sm:text-xl text-landing-text-secondary mb-10 max-w-3xl mx-auto leading-relaxed">
            Start with the live demo or dive straight into the code. 
            Join 500+ developers already shipping with CustomGPT.ai Starter Kit.
          </p>
          
          {/* Primary CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <a href="/" className="bg-gradient-to-r from-customgpt-primary to-customgpt-secondary text-white px-10 py-4 rounded-xl font-bold text-lg hover:shadow-xl hover:shadow-customgpt-primary/25 hover:-translate-y-1 transition-all duration-300 flex items-center gap-2 justify-center">
              <RocketIcon size={20} /> Try Live Demo
            </a>
            <a href="https://github.com/Poll-The-People/customgpt-starter-kit?utm_source=starterkit.customgpt.ai" target="_blank" rel="noopener noreferrer" className="bg-white border-2 border-customgpt-primary text-customgpt-primary px-10 py-4 rounded-xl font-bold text-lg hover:bg-customgpt-primary hover:text-white hover:-translate-y-1 transition-all duration-300 flex items-center gap-2 justify-center">
              <GitHubIcon size={20} /> Clone Repository
            </a>
            <a href="https://docs.customgpt.ai?utm_source=starterkit.customgpt.ai" target="_blank" rel="noopener noreferrer" className="bg-white border-2 border-customgpt-secondary text-customgpt-secondary px-10 py-4 rounded-xl font-bold text-lg hover:bg-customgpt-secondary hover:text-white hover:-translate-y-1 transition-all duration-300 flex items-center gap-2 justify-center">
              <BookIcon size={20} /> Read Documentation
            </a>
          </div>
          
          {/* Quick Links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <a 
              href="https://github.com/Poll-The-People/customgpt-starter-kit?utm_source=starterkit.customgpt.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="group p-6 bg-white border border-landing-surface-light rounded-xl hover:border-customgpt-primary hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="text-2xl mb-3">
                <TargetIcon size={32} className="mx-auto text-customgpt-primary" />
              </div>
              <div className="font-semibold text-landing-text group-hover:text-customgpt-primary transition-colors">
                Starter Kit →
              </div>
              <div className="text-sm text-landing-text-secondary mt-1">
                Get the code
              </div>
            </a>
            
            <a 
              href="https://github.com/Poll-The-People/customgpt-integrations?utm_source=starterkit.customgpt.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="group p-6 bg-white border border-landing-surface-light rounded-xl hover:border-customgpt-secondary hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="text-2xl mb-3">
                <RocketChatIcon size={32} className="mx-auto text-customgpt-secondary" />
              </div>
              <div className="font-semibold text-landing-text group-hover:text-customgpt-secondary transition-colors">
                Bot Integrations →
              </div>
              <div className="text-sm text-landing-text-secondary mt-1">
                9 platforms
              </div>
            </a>
            
            <a 
              href="https://docs.customgpt.ai?utm_source=starterkit.customgpt.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="group p-6 bg-white border border-landing-surface-light rounded-xl hover:border-customgpt-dark-blue hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="text-2xl mb-3">
                <BookIcon size={32} className="mx-auto text-customgpt-dark-blue" />
              </div>
              <div className="font-semibold text-landing-text group-hover:text-customgpt-dark-blue transition-colors">
                API Docs →
              </div>
              <div className="text-sm text-landing-text-secondary mt-1">
                Full reference
              </div>
            </a>
            
            <a 
              href="https://customgpt.ai/slack?utm_source=starterkit.customgpt.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="group p-6 bg-white border border-landing-surface-light rounded-xl hover:border-customgpt-midtone hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="text-2xl mb-3">
                <DiscordIcon size={32} className="mx-auto text-customgpt-midtone" />
              </div>
              <div className="font-semibold text-landing-text group-hover:text-customgpt-midtone transition-colors">
                Slack Community →
              </div>
              <div className="text-sm text-landing-text-secondary mt-1">
                Get support
              </div>
            </a>
          </div>
          
          {/* Bottom Badge */}
          <div className="mt-16 inline-flex items-center gap-3 bg-white border border-landing-surface-light rounded-full px-6 py-3">
            <div className="flex -space-x-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`w-8 h-8 rounded-full bg-gradient-to-r ${
                  i % 2 === 0 ? 'from-customgpt-primary to-customgpt-secondary' : 'from-customgpt-secondary to-customgpt-dark-blue'
                } border-2 border-white flex items-center justify-center text-white text-xs font-bold`}>
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <div className="text-landing-text-secondary text-sm">
              <span className="font-semibold text-landing-text">500+ developers</span> are building with this
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}