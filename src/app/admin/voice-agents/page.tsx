'use client';

import { useEffect, useState } from 'react';
import { Mic, ExternalLink, Play, Loader2, RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RoleGate } from '@/components/admin/RoleGate';
import { VOICE_AGENTS, type VoiceAgentDifficulty, type VoiceAgentConfig } from '@/types/elevenlabs';

const DIFFICULTY_STYLES: Record<VoiceAgentDifficulty, { badge: string; section: string; dot: string }> = {
  Beginner: {
    badge: 'bg-green-100 text-green-800 border-green-200',
    section: 'border-green-200 bg-green-50/40',
    dot: 'bg-green-400',
  },
  Intermediate: {
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    section: 'border-amber-200 bg-amber-50/40',
    dot: 'bg-amber-400',
  },
  Advanced: {
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    section: 'border-rose-200 bg-rose-50/40',
    dot: 'bg-rose-400',
  },
};

const PERSONA_INITIALS: Record<string, { initials: string; bg: string; text: string }> = {
  'Zoe Chen': { initials: 'ZC', bg: 'bg-green-100', text: 'text-green-700' },
  'Maya Torres': { initials: 'MT', bg: 'bg-amber-100', text: 'text-amber-700' },
  'Vanessa Liu': { initials: 'VL', bg: 'bg-rose-100', text: 'text-rose-700' },
};

type AgentStatus = 'active' | 'inactive' | 'unknown';

interface AgentLiveData {
  status: AgentStatus;
  name?: string;
}

const DIFFICULTIES: VoiceAgentDifficulty[] = ['Beginner', 'Intermediate', 'Advanced'];

export default function VoiceAgentsPage() {
  const [liveData, setLiveData] = useState<Record<string, AgentLiveData>>({});
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [statusFetched, setStatusFetched] = useState(false);

  const fetchAgentStatus = async () => {
    setLoadingStatus(true);
    const results: Record<string, AgentLiveData> = {};

    await Promise.allSettled(
      VOICE_AGENTS.map(async (agent) => {
        try {
          const res = await fetch(`/api/proxy/elevenlabs/agents/${agent.agentId}`);
          if (res.ok) {
            const data = await res.json();
            results[agent.agentId] = {
              status: 'active',
              name: data?.name,
            };
          } else {
            results[agent.agentId] = { status: 'inactive' };
          }
        } catch {
          results[agent.agentId] = { status: 'unknown' };
        }
      })
    );

    setLiveData(results);
    setLoadingStatus(false);
    setStatusFetched(true);
  };

  useEffect(() => {
    fetchAgentStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const agentsByDifficulty = DIFFICULTIES.reduce<Record<VoiceAgentDifficulty, VoiceAgentConfig[]>>(
    (acc, level) => {
      acc[level] = VOICE_AGENTS.filter(a => a.difficulty === level);
      return acc;
    },
    { Beginner: [], Intermediate: [], Advanced: [] }
  );

  return (
    <RoleGate minRole="store_manager">
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-coach-mahogany flex items-center gap-2.5">
                <Mic className="h-6 w-6 text-coach-gold" />
                Voice Agents
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                All active ElevenLabs Practice Floor personas
              </p>
            </div>
            <Button
              variant="outline"
              onClick={fetchAgentStatus}
              disabled={loadingStatus}
              className="self-start sm:self-auto"
            >
              {loadingStatus ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1.5" />
              )}
              Refresh Status
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {DIFFICULTIES.map((level) => {
              const agents = agentsByDifficulty[level];
              const styles = DIFFICULTY_STYLES[level];
              const activeCount = agents.filter(a => liveData[a.agentId]?.status === 'active').length;
              return (
                <Card key={level} className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('w-2 h-2 rounded-full', styles.dot)} />
                    <span className="text-sm font-medium text-gray-700">{level}</span>
                  </div>
                  <p className="text-2xl font-bold text-coach-mahogany">{agents.length}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {statusFetched ? `${activeCount} active` : 'agents'}
                  </p>
                </Card>
              );
            })}
          </div>

          {/* Agent groups by difficulty */}
          <div className="space-y-8">
            {DIFFICULTIES.map((level) => {
              const agents = agentsByDifficulty[level];
              const styles = DIFFICULTY_STYLES[level];
              return (
                <div key={level}>
                  <div className="flex items-center gap-2.5 mb-4">
                    <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', styles.dot)} />
                    <h2 className="text-base font-semibold text-gray-800">{level}</h2>
                    <span className="text-xs text-gray-400">
                      {agents.length} agent{agents.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {agents.map((agent) => {
                      const live = liveData[agent.agentId];
                      const persona = PERSONA_INITIALS[agent.name] ?? { initials: '??', bg: 'bg-gray-100', text: 'text-gray-600' };
                      return (
                        <AgentCard
                          key={agent.agentId}
                          agent={agent}
                          live={live}
                          loadingStatus={loadingStatus}
                          persona={persona}
                          styles={styles}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </RoleGate>
  );
}

interface AgentCardProps {
  agent: VoiceAgentConfig;
  live: AgentLiveData | undefined;
  loadingStatus: boolean;
  persona: { initials: string; bg: string; text: string };
  styles: { badge: string; section: string; dot: string };
}

function AgentCard({ agent, live, loadingStatus, persona, styles }: AgentCardProps) {
  const testUrl = `https://elevenlabs.io/convai/${agent.agentId}`;
  const dashboardUrl = `https://elevenlabs.io/app/agents/agents/${agent.agentId}`;

  return (
    <Card className="bg-white hover:shadow-md transition-shadow overflow-hidden">
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-4">
          <div className={cn('w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold', persona.bg, persona.text)}>
            {persona.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h3 className="font-semibold text-coach-mahogany truncate text-sm">{agent.name}</h3>
              <StatusIndicator live={live} loading={loadingStatus} />
            </div>
            <p className="text-xs text-gray-500 mt-0.5 leading-snug">{agent.scenario}</p>
          </div>
        </div>

        {/* Difficulty badge */}
        <div className="mb-3">
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', styles.badge)}>
            {agent.difficulty}
          </span>
        </div>

        {/* Agent ID */}
        <div className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg mb-4 border', styles.section)}>
          <Mic className="h-3 w-3 text-gray-400 flex-shrink-0" />
          <span className="font-mono text-[11px] text-gray-500 truncate" title={agent.agentId}>
            {agent.agentId}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <a
            href={testUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button
              size="sm"
              className="w-full bg-coach-gold hover:bg-coach-gold/90 text-white text-xs"
            >
              <Play className="h-3 w-3 mr-1.5" />
              Test Agent
            </Button>
          </a>
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              title="View in ElevenLabs dashboard"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </a>
        </div>
      </div>
    </Card>
  );
}

function StatusIndicator({ live, loading }: { live: AgentLiveData | undefined; loading: boolean }) {
  if (loading) {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-300 flex-shrink-0" />;
  }
  if (!live) {
    return <span title="Status unknown"><AlertCircle className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" /></span>;
  }
  if (live.status === 'active') {
    return <span title="Active"><CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" /></span>;
  }
  if (live.status === 'inactive') {
    return <span title="Inactive"><XCircle className="h-3.5 w-3.5 text-rose-400 flex-shrink-0" /></span>;
  }
  return <span title="Status unknown"><AlertCircle className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" /></span>;
}
