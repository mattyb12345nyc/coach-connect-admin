'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useConfigStore } from '@/store';
import { useDemoModeContext } from '@/contexts/DemoModeContext';
import type { Agent } from '@/types';
import TurnstileGate from '@/components/chat/TurnstileGate';

const ChatLayout = dynamic(
  () => import('@/components/chat/ChatLayout').then(mod => ({ default: mod.ChatLayout })),
  { ssr: false }
);

export default function ChatHistoryPage() {
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { isRuntimeDemoMode, deploymentMode, isInitialized } = useDemoModeContext();

  useEffect(() => {
    if (!isInitialized) return;

    if (!deploymentMode) {
      setIsLoading(false);
      return;
    }

    if (isRuntimeDemoMode) {
      setIsSetupComplete(true);
      setIsLoading(false);
    } else {
      fetch('/api/proxy/validate-keys')
        .then(response => response.json())
        .then(data => {
          setIsSetupComplete(data.valid === true);
          setIsLoading(false);
        })
        .catch(() => {
          fetch('/api/proxy/projects?limit=1')
            .then(response => {
              setIsSetupComplete(response.ok);
              setIsLoading(false);
            })
            .catch(() => {
              setIsSetupComplete(false);
              setIsLoading(false);
            });
        });
    }
  }, [isRuntimeDemoMode, deploymentMode, isInitialized]);

  const handleAgentSettings = (agent: Agent) => {
    router.push(`/projects?id=${agent.id}`);
  };

  if (isLoading || !isInitialized) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-coach-gold" />
      </div>
    );
  }

  if (!isSetupComplete && !isRuntimeDemoMode) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-gray-500 text-sm">Chat is not available. API keys may not be configured.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] bg-gray-50">
      <TurnstileGate>
        <ChatLayout
          mode="standalone"
          onAgentSettings={handleAgentSettings}
        />
      </TurnstileGate>
    </div>
  );
}
