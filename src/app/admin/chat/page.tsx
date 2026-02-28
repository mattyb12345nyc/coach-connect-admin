'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Save,
  Loader2,
  GripVertical,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  Pencil,
  ChevronDown,
  ChevronRight,
  Bot,
  Type,
  Palette,
  Settings2,
  Sparkles,
  X,
  RefreshCw,
  Globe,
  Zap,
  Eye,
  Quote,
  ThumbsUp,
  Share2,
  Download,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { AgentSettings } from '@/types';

// ─── Quick Actions types (Supabase) ───

interface QuickAction {
  id: string;
  prompt_text: string;
  sort_order: number;
  is_active: boolean;
}

type EditingAction = Omit<QuickAction, 'id'> & { id?: string };

const EMPTY_ACTION: EditingAction = {
  prompt_text: '',
  sort_order: 0,
  is_active: true,
};

const PROJECT_ID = process.env.NEXT_PUBLIC_COACH_PROJECT_ID ?? '90868';

async function quickActionApi<T = unknown>(
  method: string,
  body?: Record<string, unknown>
): Promise<T> {
  const res = await fetch('/api/admin/chat-config', {
    method,
    ...(body && {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// ─── Collapsible Section ───

function Section({
  title,
  subtitle,
  icon: Icon,
  defaultOpen = false,
  children,
  actions,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="mb-6 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-accent/30 transition-colors"
      >
        <div className="w-9 h-9 rounded-lg bg-coach-gold/15 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4.5 h-4.5 text-coach-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {actions && <div onClick={(e) => e.stopPropagation()}>{actions}</div>}
        {open ? (
          <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      {open && <div className="border-t border-border/50 p-5">{children}</div>}
    </Card>
  );
}

// ─── Toggle Row ───

function ToggleRow({
  label,
  description,
  icon: Icon,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <button type="button" onClick={() => onChange(!value)}>
        {value ? (
          <ToggleRight className="w-7 h-7 text-coach-gold" />
        ) : (
          <ToggleLeft className="w-7 h-7 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}

// ─── Select ───

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Main Page ───

export default function ChatSettingsPage() {
  // CustomGPT settings state
  const [settings, setSettings] = useState<Partial<AgentSettings>>({});
  const [originalSettings, setOriginalSettings] = useState<Partial<AgentSettings>>({});
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [exampleQuestions, setExampleQuestions] = useState<string[]>([]);

  // Quick actions state (Supabase)
  const [actions, setActions] = useState<QuickAction[]>([]);
  const [actionsLoading, setActionsLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditingAction>(EMPTY_ACTION);
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState<EditingAction>(EMPTY_ACTION);

  // ─── Fetch CustomGPT settings ───

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch(`/api/proxy/projects/${PROJECT_ID}/settings`);
      if (!res.ok) throw new Error(`Failed to fetch settings (${res.status})`);
      const json = await res.json();
      const data: Partial<AgentSettings> = json.data ?? json;
      setSettings(data);
      setOriginalSettings(data);
      setExampleQuestions(data.example_questions ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load settings');
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      const payload: Record<string, any> = {};
      for (const [key, val] of Object.entries(settings)) {
        if (JSON.stringify(val) !== JSON.stringify((originalSettings as any)[key])) {
          payload[key] = val;
        }
      }
      if (
        JSON.stringify(exampleQuestions) !==
        JSON.stringify(originalSettings.example_questions ?? [])
      ) {
        payload.example_questions = exampleQuestions;
      }

      if (Object.keys(payload).length === 0) {
        toast.info('No changes to save');
        setSettingsSaving(false);
        return;
      }

      const res = await fetch(`/api/proxy/projects/${PROJECT_ID}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error ?? `Save failed (${res.status})`);
      }
      toast.success('Settings saved');
      await fetchSettings();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  const updateSetting = <K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // ─── Fetch Quick Actions ───

  const fetchActions = useCallback(async () => {
    setActionsLoading(true);
    try {
      const data = await quickActionApi<QuickAction[]>('GET');
      setActions(data.sort((a, b) => a.sort_order - b.sort_order));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load quick actions');
    } finally {
      setActionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchActions();
  }, [fetchSettings, fetchActions]);

  // ─── Quick Action handlers ───

  const startEditing = (action: QuickAction) => {
    setEditingId(action.id);
    setEditForm({ ...action });
    setIsAdding(false);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(EMPTY_ACTION);
  };

  const handleActionSave = async () => {
    if (!editForm.prompt_text.trim()) { toast.error('Prompt text is required'); return; }
    setSaving(editingId);
    try {
      await quickActionApi('PUT', { id: editingId, prompt_text: editForm.prompt_text.trim(), sort_order: editForm.sort_order, is_active: editForm.is_active });
      toast.success('Quick action updated');
      cancelEditing();
      await fetchActions();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to update'); }
    finally { setSaving(null); }
  };

  const handleActionAdd = async () => {
    if (!addForm.prompt_text.trim()) { toast.error('Prompt text is required'); return; }
    setSaving('new');
    try {
      await quickActionApi('POST', { prompt_text: addForm.prompt_text.trim(), sort_order: addForm.sort_order, is_active: addForm.is_active });
      toast.success('Quick action created');
      setIsAdding(false);
      setAddForm(EMPTY_ACTION);
      await fetchActions();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to create'); }
    finally { setSaving(null); }
  };

  const handleActionDelete = async (id: string) => {
    setDeleting(id);
    try {
      await quickActionApi('DELETE', { id });
      toast.success('Quick action deleted');
      if (editingId === id) cancelEditing();
      await fetchActions();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to delete'); }
    finally { setDeleting(null); }
  };

  const handleActionToggle = async (action: QuickAction) => {
    setSaving(action.id);
    try {
      await quickActionApi('PUT', { id: action.id, prompt_text: action.prompt_text, sort_order: action.sort_order, is_active: !action.is_active });
      toast.success(action.is_active ? 'Disabled' : 'Enabled');
      await fetchActions();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to toggle'); }
    finally { setSaving(null); }
  };

  // ─── Example questions helpers ───

  const addExampleQuestion = () => setExampleQuestions((prev) => [...prev, '']);
  const updateExampleQuestion = (i: number, val: string) =>
    setExampleQuestions((prev) => prev.map((q, idx) => (idx === i ? val : q)));
  const removeExampleQuestion = (i: number) =>
    setExampleQuestions((prev) => prev.filter((_, idx) => idx !== i));

  // ─── Render ───

  const hasSettingsChanges =
    JSON.stringify(settings) !== JSON.stringify(originalSettings) ||
    JSON.stringify(exampleQuestions) !== JSON.stringify(originalSettings.example_questions ?? []);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-coach-gold/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-coach-gold" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">Coach Chat</h1>
              <p className="text-muted-foreground">AI settings, messages, appearance, and quick actions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSettings}
              disabled={settingsLoading}
            >
              <RefreshCw className={cn('w-4 h-4 mr-1.5', settingsLoading && 'animate-spin')} />
              Refresh
            </Button>
            {hasSettingsChanges && (
              <Button
                size="sm"
                onClick={saveSettings}
                disabled={settingsSaving}
                className="bg-coach-gold hover:bg-coach-gold/90 text-white"
              >
                {settingsSaving ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1.5" />
                )}
                Save Changes
              </Button>
            )}
          </div>
        </div>

        {settingsLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-coach-gold" />
          </div>
        ) : (
          <>
            {/* ─── Section 1: AI Persona & Model ─── */}
            <Section
              title="AI Persona & Model"
              subtitle="Define the chatbot's personality, model, and behavior"
              icon={Bot}
              defaultOpen={true}
            >
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Persona Instructions</Label>
                  <p className="text-xs text-muted-foreground">
                    System prompt that defines how Tabby responds to users
                  </p>
                  <textarea
                    value={settings.persona_instructions ?? ''}
                    onChange={(e) => updateSetting('persona_instructions', e.target.value)}
                    rows={6}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold outline-none resize-y"
                    placeholder="You are Tabby, a knowledgeable Coach brand ambassador..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Custom Persona Name</Label>
                  <Input
                    value={settings.custom_persona ?? ''}
                    onChange={(e) => updateSetting('custom_persona', e.target.value)}
                    placeholder="e.g. Tabby"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Response Source"
                    value={settings.response_source ?? 'default'}
                    options={[
                      { value: 'default', label: 'Default' },
                      { value: 'own_content', label: 'Own Content Only' },
                      { value: 'openai_content', label: 'OpenAI Content' },
                    ]}
                    onChange={(v) => updateSetting('response_source', v as AgentSettings['response_source'])}
                  />

                  <Select
                    label="AI Model"
                    value={settings.chatbot_model ?? 'gpt-4-o'}
                    options={
                      settings.agent_capability === 'fastest-responses'
                        ? [
                            { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
                            { value: 'gpt-4-1-mini', label: 'GPT-4.1 Mini' },
                            { value: 'gpt-o4-mini-low', label: 'GPT O4 Mini (Low)' },
                            { value: 'gpt-o4-mini-medium', label: 'GPT O4 Mini (Medium)' },
                            { value: 'gpt-o4-mini-high', label: 'GPT O4 Mini (High)' },
                          ]
                        : [
                            { value: 'gpt-4-o', label: 'GPT-4o' },
                            { value: 'gpt-4-1', label: 'GPT-4.1' },
                            { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
                            { value: 'gpt-4-1-mini', label: 'GPT-4.1 Mini' },
                            { value: 'gpt-o4-mini-low', label: 'GPT O4 Mini (Low)' },
                            { value: 'gpt-o4-mini-medium', label: 'GPT O4 Mini (Medium)' },
                            { value: 'gpt-o4-mini-high', label: 'GPT O4 Mini (High)' },
                            { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
                            { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
                          ]
                    }
                    onChange={(v) => updateSetting('chatbot_model', v)}
                  />

                  <Select
                    label="Agent Capability"
                    value={settings.agent_capability ?? 'optimal-choice'}
                    options={[
                      { value: 'fastest-responses', label: 'Fastest Responses' },
                      { value: 'optimal-choice', label: 'Optimal Choice' },
                      { value: 'advanced-reasoning', label: 'Advanced Reasoning' },
                      { value: 'complex-tasks', label: 'Complex Tasks' },
                    ]}
                    onChange={(v) => {
                      updateSetting('agent_capability', v as AgentSettings['agent_capability']);
                      if (v === 'fastest-responses') {
                        const miniModels = ['gpt-4o-mini', 'gpt-4-1-mini', 'gpt-o4-mini-low', 'gpt-o4-mini-medium', 'gpt-o4-mini-high'];
                        if (!miniModels.includes(settings.chatbot_model ?? '')) {
                          updateSetting('chatbot_model', 'gpt-4o-mini');
                          toast.info('Model switched to GPT-4o Mini for Fastest Responses mode');
                        }
                      }
                    }}
                  />

                  <Select
                    label="Language"
                    value={settings.chatbot_msg_lang ?? 'en'}
                    options={[
                      { value: 'en', label: 'English' },
                      { value: 'es', label: 'Spanish' },
                      { value: 'fr', label: 'French' },
                      { value: 'de', label: 'German' },
                      { value: 'zh', label: 'Chinese' },
                      { value: 'ja', label: 'Japanese' },
                      { value: 'ko', label: 'Korean' },
                      { value: 'pt', label: 'Portuguese' },
                    ]}
                    onChange={(v) => updateSetting('chatbot_msg_lang', v)}
                  />
                </div>
              </div>
            </Section>

            {/* ─── Section 2: Messages & Prompts ─── */}
            <Section
              title="Messages & Prompts"
              subtitle="Welcome messages, example questions, and system messages"
              icon={Type}
            >
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Default Prompt (Welcome Message)</Label>
                  <textarea
                    value={settings.default_prompt ?? ''}
                    onChange={(e) => updateSetting('default_prompt', e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold outline-none resize-y"
                    placeholder="Welcome! How can I help you today?"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Example Questions</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addExampleQuestion}
                      className="h-7 text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  {exampleQuestions.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      No example questions. Using defaults.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {exampleQuestions.map((q, i) => (
                        <div key={i} className="flex gap-2">
                          <Input
                            value={q}
                            onChange={(e) => updateExampleQuestion(i, e.target.value)}
                            placeholder={`Question ${i + 1}`}
                            className="flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => removeExampleQuestion(i)}
                            className="p-2 text-destructive/60 hover:text-destructive rounded-md hover:bg-destructive/10"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">No Answer Message</Label>
                    <Input
                      value={settings.no_answer_message ?? ''}
                      onChange={(e) => updateSetting('no_answer_message', e.target.value)}
                      placeholder="Sorry, I couldn't find an answer..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Loading Message</Label>
                    <Input
                      value={settings.hang_in_there_msg ?? ''}
                      onChange={(e) => updateSetting('hang_in_there_msg', e.target.value)}
                      placeholder="Hang in there..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Ending Message</Label>
                    <Input
                      value={settings.ending_message ?? ''}
                      onChange={(e) => updateSetting('ending_message', e.target.value)}
                      placeholder="Thank you for chatting!"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Unavailable Message</Label>
                    <Input
                      value={settings.chatbot_siesta_msg ?? ''}
                      onChange={(e) => updateSetting('chatbot_siesta_msg', e.target.value)}
                      placeholder="I'm taking a short break..."
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Input Field Addendum</Label>
                  <Input
                    value={settings.input_field_addendum ?? ''}
                    onChange={(e) => updateSetting('input_field_addendum', e.target.value)}
                    placeholder="Additional text below the input field"
                  />
                </div>
              </div>
            </Section>

            {/* ─── Section 3: Appearance ─── */}
            <Section
              title="Appearance"
              subtitle="Chatbot title, colors, avatar, and background"
              icon={Palette}
            >
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Chatbot Title</Label>
                    <Input
                      value={settings.chatbot_title ?? ''}
                      onChange={(e) => updateSetting('chatbot_title', e.target.value)}
                      placeholder="Coach Connect"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Avatar URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={settings.chatbot_avatar ?? ''}
                        onChange={(e) => updateSetting('chatbot_avatar', e.target.value)}
                        placeholder="https://..."
                        className="flex-1"
                      />
                      {settings.chatbot_avatar && (
                        <img
                          src={settings.chatbot_avatar}
                          alt="avatar"
                          className="w-10 h-10 rounded-lg border border-border object-cover"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Primary Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.chatbot_color ?? '#c9a962'}
                        onChange={(e) => updateSetting('chatbot_color', e.target.value)}
                        className="w-10 h-10 rounded-md border border-border cursor-pointer"
                      />
                      <Input
                        value={settings.chatbot_color ?? ''}
                        onChange={(e) => updateSetting('chatbot_color', e.target.value)}
                        placeholder="#c9a962"
                        className="flex-1 font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Toolbar Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.chatbot_toolbar_color ?? '#1a1a1a'}
                        onChange={(e) => updateSetting('chatbot_toolbar_color', e.target.value)}
                        className="w-10 h-10 rounded-md border border-border cursor-pointer"
                      />
                      <Input
                        value={settings.chatbot_toolbar_color ?? ''}
                        onChange={(e) => updateSetting('chatbot_toolbar_color', e.target.value)}
                        placeholder="#1a1a1a"
                        className="flex-1 font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Title Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.chatbot_title_color ?? '#ffffff'}
                        onChange={(e) => updateSetting('chatbot_title_color', e.target.value)}
                        className="w-10 h-10 rounded-md border border-border cursor-pointer"
                      />
                      <Input
                        value={settings.chatbot_title_color ?? ''}
                        onChange={(e) => updateSetting('chatbot_title_color', e.target.value)}
                        placeholder="#ffffff"
                        className="flex-1 font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Background Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.chatbot_background_color ?? '#f5f0eb'}
                        onChange={(e) => updateSetting('chatbot_background_color', e.target.value)}
                        className="w-10 h-10 rounded-md border border-border cursor-pointer"
                      />
                      <Input
                        value={settings.chatbot_background_color ?? ''}
                        onChange={(e) => updateSetting('chatbot_background_color', e.target.value)}
                        placeholder="#f5f0eb"
                        className="flex-1 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                <Select
                  label="Background Type"
                  value={settings.chatbot_background_type ?? 'color'}
                  options={[
                    { value: 'color', label: 'Solid Color' },
                    { value: 'image', label: 'Image' },
                  ]}
                  onChange={(v) => updateSetting('chatbot_background_type', v as 'color' | 'image')}
                />

                {settings.chatbot_background_type === 'image' && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Background Image URL</Label>
                    <Input
                      value={settings.chatbot_background ?? ''}
                      onChange={(e) => updateSetting('chatbot_background', e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                )}
              </div>
            </Section>

            {/* ─── Section 4: Features & Citations ─── */}
            <Section
              title="Features & Citations"
              subtitle="Toggle chatbot capabilities and citation display"
              icon={Settings2}
            >
              <div className="space-y-1">
                <ToggleRow
                  label="Enable Citations"
                  description="Show source citations in responses"
                  icon={Quote}
                  value={(settings.enable_citations ?? 0) === 1}
                  onChange={(v) => updateSetting('enable_citations', v ? 1 : 0)}
                />
                <ToggleRow
                  label="Enable Feedback"
                  description="Allow thumbs up/down on responses"
                  icon={ThumbsUp}
                  value={settings.enable_feedbacks ?? false}
                  onChange={(v) => updateSetting('enable_feedbacks', v)}
                />
                <ToggleRow
                  label="Markdown Formatting"
                  description="Render markdown in chat messages"
                  icon={FileText}
                  value={settings.markdown_enabled ?? true}
                  onChange={(v) => updateSetting('markdown_enabled', v)}
                />
                <ToggleRow
                  label="Loading Indicator"
                  description="Show typing animation while responding"
                  icon={Loader2}
                  value={settings.is_loading_indicator_enabled ?? true}
                  onChange={(v) => updateSetting('is_loading_indicator_enabled', v)}
                />
                <ToggleRow
                  label="Share Conversations"
                  description="Allow users to share conversation links"
                  icon={Share2}
                  value={settings.can_share_conversation ?? false}
                  onChange={(v) => updateSetting('can_share_conversation', v)}
                />
                <ToggleRow
                  label="Export Conversations"
                  description="Allow users to export conversation history"
                  icon={Download}
                  value={settings.can_export_conversation ?? false}
                  onChange={(v) => updateSetting('can_export_conversation', v)}
                />
                <ToggleRow
                  label="Remove Branding"
                  description="Hide CustomGPT branding from the chat"
                  icon={Eye}
                  value={settings.remove_branding ?? false}
                  onChange={(v) => updateSetting('remove_branding', v)}
                />
                <ToggleRow
                  label="Context-Aware Starters"
                  description="Use AI-generated starter questions based on knowledge base"
                  icon={Sparkles}
                  value={settings.use_context_aware_starter_question ?? false}
                  onChange={(v) => updateSetting('use_context_aware_starter_question', v)}
                />
                <ToggleRow
                  label="Knowledge Base Awareness"
                  description="Agent acknowledges when topics are outside its knowledge"
                  icon={Zap}
                  value={settings.enable_agent_knowledge_base_awareness ?? false}
                  onChange={(v) => updateSetting('enable_agent_knowledge_base_awareness', v)}
                />
              </div>

              {(settings.enable_citations ?? 0) === 1 && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <Select
                    label="Citations Display"
                    value={settings.citations_view_type ?? 'user'}
                    options={[
                      { value: 'user', label: 'User Choice' },
                      { value: 'show', label: 'Always Show' },
                      { value: 'hide', label: 'Always Hide' },
                    ]}
                    onChange={(v) => updateSetting('citations_view_type', v as AgentSettings['citations_view_type'])}
                  />
                </div>
              )}
            </Section>

            {/* ─── Section 5: Quick Action Prompts (Supabase) ─── */}
            <Section
              title="Quick Action Prompts"
              subtitle="Suggestion buttons shown at the start of a chat session"
              icon={Sparkles}
              actions={
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAdding(true);
                    setAddForm({
                      ...EMPTY_ACTION,
                      sort_order: actions.length > 0
                        ? Math.max(...actions.map((a) => a.sort_order)) + 1
                        : 1,
                    });
                    cancelEditing();
                  }}
                  disabled={isAdding}
                  className="bg-coach-gold hover:bg-coach-gold/90 text-white"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add
                </Button>
              }
              defaultOpen={true}
            >
              {actionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-coach-gold" />
                </div>
              ) : actions.length === 0 && !isAdding ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No quick actions configured yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {actions.map((action) => (
                    <div
                      key={action.id}
                      className={cn(
                        'rounded-lg border transition-colors',
                        editingId === action.id ? 'border-coach-gold/50 bg-coach-gold/5' : 'border-border bg-white'
                      )}
                    >
                      {editingId === action.id ? (
                        <div className="p-4 space-y-4">
                          <div className="space-y-2">
                            <Label className="font-semibold text-sm">Prompt Text</Label>
                            <Input value={editForm.prompt_text} onChange={(e) => setEditForm((f) => ({ ...f, prompt_text: e.target.value }))} placeholder="e.g. Help me prepare for a meeting" />
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="space-y-2">
                              <Label className="font-semibold text-sm">Sort Order</Label>
                              <Input type="number" className="w-24" value={editForm.sort_order} onChange={(e) => setEditForm((f) => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))} />
                            </div>
                            <div className="space-y-2">
                              <Label className="font-semibold text-sm">Active</Label>
                              <button type="button" onClick={() => setEditForm((f) => ({ ...f, is_active: !f.is_active }))} className="flex items-center gap-1.5 pt-1">
                                {editForm.is_active ? <ToggleRight className="w-7 h-7 text-coach-gold" /> : <ToggleLeft className="w-7 h-7 text-muted-foreground" />}
                                <span className="text-sm text-muted-foreground">{editForm.is_active ? 'On' : 'Off'}</span>
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-2">
                            <Button size="sm" onClick={handleActionSave} disabled={saving === editingId} className="bg-coach-gold hover:bg-coach-gold/90 text-white">
                              {saving === editingId ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEditing}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-4">
                          <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-sm font-medium truncate', action.is_active ? 'text-foreground' : 'text-muted-foreground line-through')}>{action.prompt_text}</p>
                            <span className="text-xs text-muted-foreground">Order: {action.sort_order}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button type="button" onClick={() => handleActionToggle(action)} disabled={saving === action.id} className="p-1.5 rounded-md hover:bg-accent transition-colors">
                              {saving === action.id ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : action.is_active ? <ToggleRight className="w-5 h-5 text-coach-gold" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                            </button>
                            <button type="button" onClick={() => startEditing(action)} className="p-1.5 rounded-md hover:bg-accent transition-colors"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                            <button type="button" onClick={() => handleActionDelete(action.id)} disabled={deleting === action.id} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors">
                              {deleting === action.id ? <Loader2 className="w-4 h-4 animate-spin text-destructive" /> : <Trash2 className="w-4 h-4 text-destructive/70" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {isAdding && (
                    <div className="rounded-lg border border-coach-gold/50 bg-coach-gold/5 p-4 space-y-4">
                      <div className="space-y-2">
                        <Label className="font-semibold text-sm">Prompt Text</Label>
                        <Input value={addForm.prompt_text} onChange={(e) => setAddForm((f) => ({ ...f, prompt_text: e.target.value }))} placeholder="e.g. Help me prepare for a meeting" autoFocus />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="space-y-2">
                          <Label className="font-semibold text-sm">Sort Order</Label>
                          <Input type="number" className="w-24" value={addForm.sort_order} onChange={(e) => setAddForm((f) => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))} />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-semibold text-sm">Active</Label>
                          <button type="button" onClick={() => setAddForm((f) => ({ ...f, is_active: !f.is_active }))} className="flex items-center gap-1.5 pt-1">
                            {addForm.is_active ? <ToggleRight className="w-7 h-7 text-coach-gold" /> : <ToggleLeft className="w-7 h-7 text-muted-foreground" />}
                            <span className="text-sm text-muted-foreground">{addForm.is_active ? 'On' : 'Off'}</span>
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Button size="sm" onClick={handleActionAdd} disabled={saving === 'new'} className="bg-coach-gold hover:bg-coach-gold/90 text-white">
                          {saving === 'new' ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
                          Create
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setIsAdding(false); setAddForm(EMPTY_ACTION); }}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Section>

          </>
        )}
      </div>
    </div>
  );
}
