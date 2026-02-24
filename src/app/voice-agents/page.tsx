'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Mic,
  ChevronDown,
  ChevronUp,
  Save,
  RefreshCw,
  Clock,
  User,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ElevenLabsAgentConfig, ElevenLabsConversation } from '@/types/elevenlabs';
import { VOICE_AGENT_IDS } from '@/types/elevenlabs';

const API = {
  getAgent: (agentId: string) =>
    fetch(`/api/proxy/elevenlabs/agents/${agentId}`).then((r) => {
      if (!r.ok) throw new Error(r.statusText);
      return r.json();
    }),
  patchAgent: (agentId: string, body: object) =>
    fetch(`/api/proxy/elevenlabs/agents/${agentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => {
      if (!r.ok) return r.json().then((data) => Promise.reject(new Error((data as any).error || r.statusText)));
      return r.json();
    }),
  getConversations: (agentId: string) =>
    fetch(`/api/proxy/elevenlabs/conversations?agent_id=${encodeURIComponent(agentId)}`).then((r) => {
      if (!r.ok) throw new Error(r.statusText);
      return r.json();
    }),
};

function getNested<T = string>(obj: any, path: string): T | undefined {
  const keys = path.split('.');
  let cur: any = obj;
  for (const k of keys) {
    cur = cur?.[k];
  }
  return cur as T | undefined;
}

function setNested(obj: any, path: string, value: unknown) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (cur[k] == null) cur[k] = {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
}

function buildPatchPayload(form: Record<string, unknown>): object {
  const conversation_config: Record<string, unknown> = {};
  if (form.first_message !== undefined) {
    if (!conversation_config.agent) conversation_config.agent = {};
    (conversation_config.agent as any).first_message = form.first_message;
  }
  if (form.system_prompt !== undefined) {
    if (!conversation_config.agent) conversation_config.agent = {};
    if (!(conversation_config.agent as any).prompt) (conversation_config.agent as any).prompt = {};
    (conversation_config.agent as any).prompt.prompt = form.system_prompt;
  }
  if (form.temperature !== undefined) {
    if (!conversation_config.agent) conversation_config.agent = {};
    if (!(conversation_config.agent as any).prompt) (conversation_config.agent as any).prompt = {};
    (conversation_config.agent as any).prompt.temperature = Number(form.temperature);
  }
  if (form.llm !== undefined) {
    if (!conversation_config.agent) conversation_config.agent = {};
    if (!(conversation_config.agent as any).prompt) (conversation_config.agent as any).prompt = {};
    (conversation_config.agent as any).prompt.llm = form.llm;
  }
  if (form.language !== undefined) {
    if (!conversation_config.agent) conversation_config.agent = {};
    (conversation_config.agent as any).language = form.language;
  }
  if (form.voice_id !== undefined) {
    if (!conversation_config.tts) conversation_config.tts = {};
    (conversation_config.tts as any).voice_id = form.voice_id;
  }
  if (form.turn_timeout !== undefined) {
    if (!conversation_config.turn) conversation_config.turn = {};
    (conversation_config.turn as any).turn_timeout = Number(form.turn_timeout);
  }
  if (form.turn_eagerness !== undefined) {
    if (!conversation_config.turn) conversation_config.turn = {};
    (conversation_config.turn as any).turn_eagerness = Number(form.turn_eagerness);
  }
  if (form.max_duration_seconds !== undefined) {
    if (!conversation_config.conversation) conversation_config.conversation = {};
    (conversation_config.conversation as any).max_duration_seconds = Number(form.max_duration_seconds);
  }
  return { conversation_config };
}

export default function VoiceAgentsPage() {
  const [agents, setAgents] = useState<Record<string, ElevenLabsAgentConfig | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [conversations, setConversations] = useState<Record<string, ElevenLabsConversation[]>>({});
  const [convLoading, setConvLoading] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, Record<string, unknown>>>({});

  const fetchAgent = useCallback(async (agentId: string) => {
    setLoading((prev) => ({ ...prev, [agentId]: true }));
    try {
      const data = await API.getAgent(agentId);
      setAgents((prev) => ({ ...prev, [agentId]: data }));
      const cfg = data?.conversation_config;
      setForm((prev) => ({
        ...prev,
        [agentId]: {
          first_message: getNested(cfg, 'agent.first_message') ?? '',
          system_prompt: getNested(cfg, 'agent.prompt.prompt') ?? '',
          temperature: getNested<number>(cfg, 'agent.prompt.temperature') ?? 0.7,
          llm: getNested(cfg, 'agent.prompt.llm') ?? '',
          language: getNested(cfg, 'agent.language') ?? 'en',
          voice_id: getNested(cfg, 'tts.voice_id') ?? '',
          turn_timeout: getNested<number>(cfg, 'turn.turn_timeout') ?? 30,
          turn_eagerness: getNested<number>(cfg, 'turn.turn_eagerness') ?? 0.5,
          max_duration_seconds: getNested<number>(cfg, 'conversation.max_duration_seconds') ?? 600,
        },
      }));
    } catch (e) {
      toast.error(`Failed to load agent: ${e instanceof Error ? e.message : 'Unknown error'}`);
      setAgents((prev) => ({ ...prev, [agentId]: null }));
    } finally {
      setLoading((prev) => ({ ...prev, [agentId]: false }));
    }
  }, []);

  const fetchConversations = useCallback(async (agentId: string) => {
    setConvLoading((prev) => ({ ...prev, [agentId]: true }));
    try {
      const data = await API.getConversations(agentId);
      const list = Array.isArray(data) ? data : (data?.conversations ?? data?.data ?? []);
      setConversations((prev) => ({ ...prev, [agentId]: Array.isArray(list) ? list : [] }));
    } catch {
      setConversations((prev) => ({ ...prev, [agentId]: [] }));
    } finally {
      setConvLoading((prev) => ({ ...prev, [agentId]: false }));
    }
  }, []);

  useEffect(() => {
    VOICE_AGENT_IDS.forEach(({ id }) => {
      fetchAgent(id);
    });
  }, [fetchAgent]);

  const handleSave = async (agentId: string) => {
    const f = form[agentId];
    if (!f) return;
    setSaving((prev) => ({ ...prev, [agentId]: true }));
    try {
      await API.patchAgent(agentId, buildPatchPayload(f));
      toast.success('Agent updated');
      await fetchAgent(agentId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving((prev) => ({ ...prev, [agentId]: false }));
    }
  };

  const handleRefreshConversations = (agentId: string) => {
    fetchConversations(agentId);
  };

  const levelColor = (level: string) => {
    if (level === 'Beginner') return 'bg-green-100 text-green-800 border-green-200';
    if (level === 'Intermediate') return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-coach-gold/20 text-coach-mahogany border-coach-brown';
  };

  return (
    <PageLayout>
      <div className="min-h-[calc(100vh-4rem)] bg-coach-cream">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Voice Agents</h1>
          <p className="text-muted-foreground mb-8">
            Practice Floor personas for roleplay training. Edit first message, system prompt, voice, and conversation settings.
          </p>

          {/* Agent cards */}
          <div className="space-y-4 mb-12">
            {VOICE_AGENT_IDS.map(({ id, name, level }) => {
              const agent = agents[id];
              const isLoading = loading[id];
              const isSaving = saving[id];
              const expanded = expandedId === id;
              const f = form[id] ?? {};

              return (
                <Card
                  key={id}
                  className={cn(
                    'overflow-hidden border-2 transition-colors',
                    expanded ? 'border-coach-gold/50' : 'border-border'
                  )}
                >
                  <button
                    type="button"
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-accent/50 transition-colors"
                    onClick={() => setExpandedId(expanded ? null : id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-coach-gold/20 flex items-center justify-center flex-shrink-0">
                        <Mic className="w-5 h-5 text-coach-gold" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-display font-semibold text-lg text-foreground truncate">{name}</h2>
                        <span
                          className={cn(
                            'inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium border',
                            levelColor(level)
                          )}
                        >
                          {level}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {agent && (
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {getNested(agent.conversation_config, 'agent.first_message') || '—'}
                        </p>
                      )}
                      {expanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-border bg-card p-6 space-y-6">
                      {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-8 h-8 animate-spin text-coach-gold" />
                        </div>
                      ) : (
                        <>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                              <Label className="text-coach-mahogany">First message</Label>
                              <Input
                                value={(f.first_message as string) ?? ''}
                                onChange={(e) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    [id]: { ...prev[id], first_message: e.target.value },
                                  }))
                                }
                                className="mt-1 border-border focus:ring-coach-gold"
                                placeholder="Opening line the AI customer says"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <Label className="text-coach-mahogany">System prompt (persona instructions)</Label>
                              <textarea
                                value={(f.system_prompt as string) ?? ''}
                                onChange={(e) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    [id]: { ...prev[id], system_prompt: e.target.value },
                                  }))
                                }
                                rows={4}
                                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-coach-gold focus:border-coach-gold"
                                placeholder="Full persona instructions"
                              />
                            </div>
                            <div>
                              <Label className="text-coach-mahogany">Voice ID</Label>
                              <Input
                                value={(f.voice_id as string) ?? ''}
                                onChange={(e) =>
                                  setForm((prev) => ({ ...prev, [id]: { ...prev[id], voice_id: e.target.value } }))
                                }
                                className="mt-1 border-border focus:ring-coach-gold"
                              />
                            </div>
                            <div>
                              <Label className="text-coach-mahogany">LLM model</Label>
                              <Input
                                value={(f.llm as string) ?? ''}
                                onChange={(e) =>
                                  setForm((prev) => ({ ...prev, [id]: { ...prev[id], llm: e.target.value } }))
                                }
                                className="mt-1 border-border focus:ring-coach-gold"
                              />
                            </div>
                            <div>
                              <Label className="text-coach-mahogany">Temperature</Label>
                              <Input
                                type="number"
                                min={0}
                                max={2}
                                step={0.1}
                                value={(f.temperature as number) ?? 0.7}
                                onChange={(e) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    [id]: { ...prev[id], temperature: parseFloat(e.target.value) || 0.7 },
                                  }))
                                }
                                className="mt-1 border-border focus:ring-coach-gold"
                              />
                            </div>
                            <div>
                              <Label className="text-coach-mahogany">Language</Label>
                              <Input
                                value={(f.language as string) ?? 'en'}
                                onChange={(e) =>
                                  setForm((prev) => ({ ...prev, [id]: { ...prev[id], language: e.target.value } }))
                                }
                                className="mt-1 border-border focus:ring-coach-gold"
                              />
                            </div>
                            <div>
                              <Label className="text-coach-mahogany">Max duration (seconds)</Label>
                              <Input
                                type="number"
                                min={0}
                                value={(f.max_duration_seconds as number) ?? 600}
                                onChange={(e) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    [id]: {
                                      ...prev[id],
                                      max_duration_seconds: parseInt(e.target.value, 10) || 600,
                                    },
                                  }))
                                }
                                className="mt-1 border-border focus:ring-coach-gold"
                              />
                            </div>
                            <div>
                              <Label className="text-coach-mahogany">Turn timeout (seconds)</Label>
                              <Input
                                type="number"
                                min={0}
                                value={(f.turn_timeout as number) ?? 30}
                                onChange={(e) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    [id]: { ...prev[id], turn_timeout: parseInt(e.target.value, 10) || 30 },
                                  }))
                                }
                                className="mt-1 border-border focus:ring-coach-gold"
                              />
                            </div>
                            <div>
                              <Label className="text-coach-mahogany">Turn eagerness (0–1)</Label>
                              <Input
                                type="number"
                                min={0}
                                max={1}
                                step={0.1}
                                value={(f.turn_eagerness as number) ?? 0.5}
                                onChange={(e) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    [id]: {
                                      ...prev[id],
                                      turn_eagerness: parseFloat(e.target.value) || 0.5,
                                    },
                                  }))
                                }
                                className="mt-1 border-border focus:ring-coach-gold"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end pt-2">
                            <Button
                              onClick={() => handleSave(id)}
                              disabled={isSaving}
                              className="bg-coach-gold hover:bg-coach-brown text-white"
                            >
                              {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <Save className="w-4 h-4 mr-2" />
                              )}
                              Save
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Conversation History */}
          <section>
            <h2 className="font-display text-2xl font-bold text-foreground mb-4">Conversation History</h2>
            <p className="text-muted-foreground mb-6">
              Recent practice sessions per agent. Use the refresh button to load conversations.
            </p>
            <div className="space-y-6">
              {VOICE_AGENT_IDS.map(({ id, name }) => {
                const list = conversations[id] ?? [];
                const loadingConv = convLoading[id];
                return (
                  <Card key={id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-display font-semibold text-foreground">{name}</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRefreshConversations(id)}
                        disabled={loadingConv}
                        className="border-coach-gold text-coach-gold hover:bg-coach-gold/10"
                      >
                        {loadingConv ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-1" />
                        )}
                        Refresh
                      </Button>
                    </div>
                    {loadingConv ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-6 h-6 animate-spin text-coach-gold" />
                      </div>
                    ) : list.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">No conversations yet. Click Refresh to load.</p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {list.slice(0, 20).map((c: ElevenLabsConversation, idx: number) => (
                          <li key={(c.id ?? idx) as string} className="py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <User className="w-4 h-4" />
                              {(c as any).caller?.name ?? (c as any).caller_id ?? '—'}
                            </span>
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              {c.duration_seconds != null ? `${c.duration_seconds}s` : '—'}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-accent text-muted-foreground">
                              {c.status ?? '—'}
                            </span>
                            <span className="text-muted-foreground">
                              {c.created_at
                                ? new Date(c.created_at).toLocaleString()
                                : c.updated_at
                                  ? new Date(c.updated_at).toLocaleString()
                                  : '—'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </PageLayout>
  );
}
