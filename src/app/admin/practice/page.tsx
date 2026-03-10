'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mic, Save, Loader2, User, ChevronDown, ChevronRight, Brain, BarChart3, AudioLines, Play, ExternalLink, RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RoleGate } from '@/components/admin/RoleGate';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { ScenarioGeneratorSection } from '@/components/admin/ScenarioGeneratorSection';
import { VOICE_AGENTS, type VoiceAgentDifficulty, type VoiceAgentConfig } from '@/types/elevenlabs';

export default function PracticeFloorPage() {
  const { isAdmin } = useAdminAuth();

  // Voice agents state
  const [voiceLiveData, setVoiceLiveData] = useState<Record<string, { status: 'active' | 'inactive' | 'unknown' }>>({});
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceFetched, setVoiceFetched] = useState(false);

  const fetchVoiceAgentStatus = useCallback(async () => {
    setVoiceLoading(true);
    const results: Record<string, { status: 'active' | 'inactive' | 'unknown' }> = {};
    await Promise.allSettled(
      VOICE_AGENTS.map(async (agent) => {
        try {
          const res = await fetch(`/api/proxy/elevenlabs/agents/${agent.agentId}`);
          results[agent.agentId] = { status: res.ok ? 'active' : 'inactive' };
        } catch {
          results[agent.agentId] = { status: 'unknown' };
        }
      })
    );
    setVoiceLiveData(results);
    setVoiceLoading(false);
    setVoiceFetched(true);
  }, []);

  // Analysis config state
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisConfig, setAnalysisConfig] = useState<{ id?: string; system_prompt: string; model: string; max_tokens: number }>({ system_prompt: '', model: 'claude-sonnet-4-20250514', max_tokens: 1024 });
  const [scoringCategories, setScoringCategories] = useState<{ id: string; key: string; label: string; icon: string; color: string; max_score: number; sort_order: number; is_active: boolean }[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisSaving, setAnalysisSaving] = useState(false);

  const fetchAnalysisConfig = useCallback(async () => {
    setAnalysisLoading(true);
    try {
      const res = await fetch('/api/admin/analysis-config');
      if (!res.ok) throw new Error('Failed to load analysis config');
      const data = await res.json();
      if (data.config) setAnalysisConfig(data.config);
      if (data.categories) setScoringCategories(data.categories);
    } catch {
      // Tables may not exist yet
    } finally {
      setAnalysisLoading(false);
    }
  }, []);

  const saveAnalysisConfig = async () => {
    setAnalysisSaving(true);
    try {
      const res = await fetch('/api/admin/analysis-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: analysisConfig, categories: scoringCategories }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Analysis config saved');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save analysis config');
    } finally {
      setAnalysisSaving(false);
    }
  };

  useEffect(() => {
    fetchAnalysisConfig();
    fetchVoiceAgentStatus();
  }, [fetchAnalysisConfig, fetchVoiceAgentStatus]);

  return (
    <RoleGate minRole="store_manager" readOnlyFor={['store_manager']}>
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div>
              <h1 className="text-2xl font-bold text-coach-mahogany flex items-center gap-2.5">
                <Mic className="h-6 w-6 text-coach-gold" />
                Practice Floor
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage voice agent settings, evaluation config, and admin scenario generation
              </p>
            </div>
          </div>

          {/* Post-Call Analysis Config */}
          <Card className="mb-8 overflow-hidden">
            <button
              type="button"
              onClick={() => setAnalysisOpen(!analysisOpen)}
              className="w-full flex items-center gap-3 p-5 text-left hover:bg-accent/30 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-coach-gold/15 flex items-center justify-center flex-shrink-0">
                <Brain className="w-4.5 h-4.5 text-coach-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-foreground">Post-Call Analysis</h2>
                <p className="text-sm text-muted-foreground">Evaluation prompt, AI model, and scoring categories</p>
              </div>
              {analysisOpen ? (
                <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              )}
            </button>
            {analysisOpen && (
              <div className="border-t border-border/50 p-5 space-y-6">
                {analysisLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-coach-gold" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Evaluation System Prompt</Label>
                      <p className="text-xs text-muted-foreground">
                        Instructions sent to the AI for scoring practice sessions. Must include JSON output format with score keys matching the categories below.
                      </p>
                      <textarea
                        value={analysisConfig.system_prompt}
                        onChange={(e) => setAnalysisConfig((prev) => ({ ...prev, system_prompt: e.target.value }))}
                        rows={12}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold outline-none resize-y"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">AI Model</Label>
                        <select
                          value={analysisConfig.model}
                          onChange={(e) => setAnalysisConfig((prev) => ({ ...prev, model: e.target.value }))}
                          className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold outline-none"
                        >
                          <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
                          <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                          <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                          <option value="gpt-4o">GPT-4o</option>
                          <option value="gpt-4-1">GPT-4.1</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Max Tokens</Label>
                        <Input
                          type="number"
                          value={analysisConfig.max_tokens}
                          onChange={(e) => setAnalysisConfig((prev) => ({ ...prev, max_tokens: parseInt(e.target.value, 10) || 1024 }))}
                          min={256}
                          max={4096}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-coach-gold" />
                          <Label className="text-sm font-medium">Scoring Categories</Label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {scoringCategories.map((cat, idx) => (
                          <div key={cat.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-white">
                            <div className={cn('w-3 h-3 rounded-full flex-shrink-0', cat.color)} />
                            <Input
                              value={cat.label}
                              onChange={(e) => {
                                const updated = [...scoringCategories];
                                updated[idx] = { ...updated[idx], label: e.target.value };
                                setScoringCategories(updated);
                              }}
                              className="flex-1 h-8 text-sm"
                              placeholder="Category name"
                            />
                            <Input
                              value={cat.key}
                              onChange={(e) => {
                                const updated = [...scoringCategories];
                                updated[idx] = { ...updated[idx], key: e.target.value };
                                setScoringCategories(updated);
                              }}
                              className="w-40 h-8 text-sm font-mono"
                              placeholder="camelCaseKey"
                            />
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">/ {cat.max_score}</span>
                              <Input
                                type="number"
                                value={cat.max_score}
                                onChange={(e) => {
                                  const updated = [...scoringCategories];
                                  updated[idx] = { ...updated[idx], max_score: parseInt(e.target.value, 10) || 25 };
                                  setScoringCategories(updated);
                                }}
                                className="w-16 h-8 text-sm"
                                min={1}
                                max={100}
                              />
                            </div>
                            <select
                              value={cat.color}
                              onChange={(e) => {
                                const updated = [...scoringCategories];
                                updated[idx] = { ...updated[idx], color: e.target.value };
                                setScoringCategories(updated);
                              }}
                              className="h-8 px-2 rounded-md border border-border bg-background text-xs"
                            >
                              <option value="bg-blue-500">Blue</option>
                              <option value="bg-purple-500">Purple</option>
                              <option value="bg-rose-500">Rose</option>
                              <option value="bg-amber-500">Amber</option>
                              <option value="bg-emerald-500">Emerald</option>
                              <option value="bg-indigo-500">Indigo</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={saveAnalysisConfig}
                        disabled={analysisSaving}
                        className="bg-coach-gold hover:bg-coach-gold/90 text-white"
                      >
                        {analysisSaving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                        Save Analysis Config
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>

          {/* Voice Agents */}
          <div className="mt-10">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-coach-mahogany flex items-center gap-2">
                  <AudioLines className="h-5 w-5 text-coach-gold" />
                  Coach Voice Agents
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">All active Coach Voice Agent personas</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchVoiceAgentStatus} disabled={voiceLoading}>
                {voiceLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                Refresh
              </Button>
            </div>

            {(['Beginner', 'Intermediate', 'Advanced'] as VoiceAgentDifficulty[]).map((level) => {
              const agents = VOICE_AGENTS.filter(a => a.difficulty === level);
              const dotColor = level === 'Beginner' ? 'bg-green-400' : level === 'Intermediate' ? 'bg-amber-400' : 'bg-rose-400';
              return (
                <div key={level} className="mb-7">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={cn('w-2 h-2 rounded-full flex-shrink-0', dotColor)} />
                    <span className="text-sm font-semibold text-gray-700">{level}</span>
                    <span className="text-xs text-gray-400">{agents.length} agents</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {agents.map((agent) => (
                      <VoiceAgentCard
                        key={agent.agentId}
                        agent={agent}
                        status={voiceLiveData[agent.agentId]?.status}
                        loading={voiceLoading && !voiceFetched}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {isAdmin && <ScenarioGeneratorSection />}

        </div>
    </div>
    </RoleGate>
  );
}

const VOICE_DIFFICULTY_STYLES: Record<VoiceAgentDifficulty, string> = {
  Beginner: 'bg-green-100 text-green-800 border-green-200',
  Intermediate: 'bg-amber-100 text-amber-800 border-amber-200',
  Advanced: 'bg-rose-100 text-rose-800 border-rose-200',
};

function VoiceAgentCard({
  agent,
  status,
  loading,
}: {
  agent: VoiceAgentConfig;
  status: 'active' | 'inactive' | 'unknown' | undefined;
  loading: boolean;
}) {
  const badgeStyle = VOICE_DIFFICULTY_STYLES[agent.difficulty];

  return (
    <Card className="bg-white transition-shadow hover:shadow-md">
      <div className="p-5">
        {/* Avatar + name row */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className="flex-shrink-0">
            {agent.imageUrl ? (
              <img
                src={agent.imageUrl}
                alt={agent.name}
                className="h-14 w-14 rounded-full object-cover border-2 border-coach-gold/20"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-coach-champagne flex items-center justify-center border-2 border-coach-gold/20">
                <User className="h-6 w-6 text-coach-mahogany/60" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h3 className="font-semibold text-coach-mahogany truncate">{agent.name}</h3>
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-300 flex-shrink-0" />
              ) : status === 'active' ? (
                <span title="Active"><CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" /></span>
              ) : status === 'inactive' ? (
                <span title="Inactive"><XCircle className="h-3.5 w-3.5 text-rose-400 flex-shrink-0" /></span>
              ) : (
                <span title="Status unknown"><AlertCircle className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" /></span>
              )}
            </div>
            <p className="text-sm text-gray-500">{agent.scenario}</p>
            <span className={cn('inline-block mt-1.5 px-2 py-0.5 text-xs font-medium rounded-full border', badgeStyle)}>
              {agent.difficulty}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{agent.description}</p>

        {/* Agent ID */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
          <Mic className="h-3 w-3 flex-shrink-0" />
          <span className="font-mono truncate" title={agent.agentId}>
            {agent.agentId.length > 24 ? agent.agentId.slice(0, 24) + '...' : agent.agentId}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
          <a href={`https://elevenlabs.io/convai/${agent.agentId}`} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button size="sm" className="w-full bg-coach-gold hover:bg-coach-gold/90 text-white">
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Test Agent
            </Button>
          </a>
          <a href={`https://elevenlabs.io/app/agents/agents/${agent.agentId}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" title="View agent dashboard">
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </a>
        </div>
      </div>
    </Card>
  );
}
