'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mic, Plus, Trash2, Save, Loader2, Pencil, X, User, ChevronDown, ChevronRight, Brain, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

interface Persona {
  id: string;
  name: string;
  age: number;
  type: string;
  scenario: string;
  difficulty: Difficulty;
  image_url: string;
  agent_id: string;
  tip: string;
  is_active: boolean;
  sort_order: number;
}

type PersonaFormData = Omit<Persona, 'id'>;

const EMPTY_FORM: PersonaFormData = {
  name: '',
  age: 30,
  type: '',
  scenario: '',
  difficulty: 'Beginner',
  image_url: '',
  agent_id: '',
  tip: '',
  is_active: true,
  sort_order: 0,
};

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  Beginner: 'bg-green-100 text-green-800 border-green-200',
  Intermediate: 'bg-amber-100 text-amber-800 border-amber-200',
  Advanced: 'bg-rose-100 text-rose-800 border-rose-200',
};

export default function PracticeFloorPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PersonaFormData>(EMPTY_FORM);
  const [editFormData, setEditFormData] = useState<PersonaFormData>(EMPTY_FORM);

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

  const fetchPersonas = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/personas');
      if (!res.ok) throw new Error('Failed to fetch personas');
      const data = await res.json();
      setPersonas(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load personas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPersonas();
    fetchAnalysisConfig();
  }, [fetchPersonas, fetchAnalysisConfig]);

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.agent_id.trim()) {
      toast.error('Name and Agent ID are required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create persona');
      }
      const created = await res.json();
      setPersonas(prev => [...prev, created]);
      setFormData(EMPTY_FORM);
      setShowAddForm(false);
      toast.success('Persona created');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/personas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editFormData }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update persona');
      }
      const updated = await res.json();
      setPersonas(prev => prev.map(p => (p.id === id ? updated : p)));
      setEditingId(null);
      toast.success('Persona updated');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch('/api/admin/personas', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete persona');
      }
      setPersonas(prev => prev.filter(p => p.id !== id));
      toast.success(`"${name}" deleted`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleActive = async (persona: Persona) => {
    try {
      const res = await fetch('/api/admin/personas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: persona.id, is_active: !persona.is_active }),
      });
      if (!res.ok) throw new Error('Failed to toggle status');
      const updated = await res.json();
      setPersonas(prev => prev.map(p => (p.id === persona.id ? updated : p)));
      toast.success(`${persona.name} ${updated.is_active ? 'activated' : 'deactivated'}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const startEdit = (persona: Persona) => {
    setEditingId(persona.id);
    const { id, ...rest } = persona;
    setEditFormData(rest);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const renderFormFields = (
    data: PersonaFormData,
    setData: (d: PersonaFormData) => void,
  ) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={data.name}
          onChange={e => setData({ ...data, name: e.target.value })}
          placeholder="e.g. Sarah Mitchell"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="age">Age</Label>
        <Input
          id="age"
          type="number"
          value={data.age}
          onChange={e => setData({ ...data, age: parseInt(e.target.value) || 0 })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="type">Type</Label>
        <Input
          id="type"
          value={data.type}
          onChange={e => setData({ ...data, type: e.target.value })}
          placeholder="e.g. First-Time Buyer"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="difficulty">Difficulty</Label>
        <select
          id="difficulty"
          value={data.difficulty}
          onChange={e => setData({ ...data, difficulty: e.target.value as Difficulty })}
          className="flex h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm text-foreground transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>
      </div>
      <div className="sm:col-span-2 space-y-1.5">
        <Label htmlFor="scenario">Scenario</Label>
        <textarea
          id="scenario"
          value={data.scenario}
          onChange={e => setData({ ...data, scenario: e.target.value })}
          placeholder="Describe the roleplay scenario..."
          rows={3}
          className="flex w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="agent_id">Agent ID (ElevenLabs)</Label>
        <Input
          id="agent_id"
          value={data.agent_id}
          onChange={e => setData({ ...data, agent_id: e.target.value })}
          placeholder="agent_..."
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="image_url">Image URL</Label>
        <Input
          id="image_url"
          value={data.image_url}
          onChange={e => setData({ ...data, image_url: e.target.value })}
          placeholder="https://..."
        />
      </div>
      <div className="sm:col-span-2 space-y-1.5">
        <Label htmlFor="tip">Tip</Label>
        <Input
          id="tip"
          value={data.tip}
          onChange={e => setData({ ...data, tip: e.target.value })}
          placeholder="Coaching tip for this persona..."
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sort_order">Sort Order</Label>
        <Input
          id="sort_order"
          type="number"
          value={data.sort_order}
          onChange={e => setData({ ...data, sort_order: parseInt(e.target.value) || 0 })}
        />
      </div>
      <div className="flex items-end pb-1">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={data.is_active}
            onChange={e => setData({ ...data, is_active: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-coach-gold focus:ring-coach-gold"
          />
          <span className="text-sm font-medium text-foreground/90">Active</span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-coach-mahogany flex items-center gap-2.5">
                <Mic className="h-6 w-6 text-coach-gold" />
                Practice Floor
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage roleplay personas and voice agent settings
              </p>
            </div>
            <Button
              onClick={() => {
                setFormData(EMPTY_FORM);
                setShowAddForm(prev => !prev);
              }}
              className="bg-coach-gold hover:bg-coach-gold/90 text-white"
            >
              {showAddForm ? (
                <>
                  <X className="h-4 w-4 mr-1.5" /> Cancel
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1.5" /> Add Persona
                </>
              )}
            </Button>
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

          {/* Add Form */}
          {showAddForm && (
            <Card className="mb-8 border-coach-gold/30 bg-white">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-coach-mahogany mb-4">
                  New Persona
                </h2>
                {renderFormFields(formData, setFormData)}
                <div className="flex justify-end gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={saving}
                    className="bg-coach-gold hover:bg-coach-gold/90 text-white"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    ) : (
                      <Save className="h-4 w-4 mr-1.5" />
                    )}
                    Create Persona
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-coach-gold" />
            </div>
          )}

          {/* Empty State */}
          {!loading && personas.length === 0 && (
            <div className="text-center py-20">
              <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No personas yet</p>
              <p className="text-gray-400 text-sm mt-1">
                Create your first roleplay persona to get started.
              </p>
            </div>
          )}

          {/* Persona Grid */}
          {!loading && personas.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {personas.map(persona => (
                <Card
                  key={persona.id}
                  className={cn(
                    'bg-white transition-shadow hover:shadow-md',
                    !persona.is_active && 'opacity-60',
                  )}
                >
                  {editingId === persona.id ? (
                    <div className="p-5">
                      <h3 className="text-sm font-semibold text-coach-mahogany mb-3">
                        Editing
                      </h3>
                      {renderFormFields(editFormData, setEditFormData)}
                      <div className="flex justify-end gap-2 mt-5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelEdit}
                          disabled={saving}
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleUpdate(persona.id)}
                          disabled={saving}
                          className="bg-coach-gold hover:bg-coach-gold/90 text-white"
                        >
                          {saving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          ) : (
                            <Save className="h-3.5 w-3.5 mr-1" />
                          )}
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5">
                      {/* Card Header: Avatar + Info */}
                      <div className="flex items-start gap-3.5 mb-4">
                        <div className="flex-shrink-0">
                          {persona.image_url ? (
                            <img
                              src={persona.image_url}
                              alt={persona.name}
                              className="h-14 w-14 rounded-full object-cover border-2 border-coach-gold/20"
                            />
                          ) : (
                            <div className="h-14 w-14 rounded-full bg-coach-champagne flex items-center justify-center border-2 border-coach-gold/20">
                              <User className="h-6 w-6 text-coach-mahogany/60" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-coach-mahogany truncate">
                            {persona.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Age {persona.age} &middot; {persona.type}
                          </p>
                          <span
                            className={cn(
                              'inline-block mt-1.5 px-2 py-0.5 text-xs font-medium rounded-full border',
                              DIFFICULTY_STYLES[persona.difficulty],
                            )}
                          >
                            {persona.difficulty}
                          </span>
                        </div>
                      </div>

                      {/* Scenario */}
                      {persona.scenario && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                          {persona.scenario}
                        </p>
                      )}

                      {/* Agent ID */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
                        <Mic className="h-3 w-3" />
                        <span className="font-mono truncate">
                          {persona.agent_id.length > 20
                            ? persona.agent_id.slice(0, 20) + '...'
                            : persona.agent_id}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <button
                          onClick={() => handleToggleActive(persona)}
                          className={cn(
                            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                            persona.is_active ? 'bg-coach-gold' : 'bg-gray-300',
                          )}
                        >
                          <span
                            className={cn(
                              'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
                              persona.is_active ? 'translate-x-[18px]' : 'translate-x-[3px]',
                            )}
                          />
                        </button>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => startEdit(persona)}
                          >
                            <Pencil className="h-3.5 w-3.5 text-gray-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(persona.id, persona.name)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
    </div>
  );
}
