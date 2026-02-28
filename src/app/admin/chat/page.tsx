'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';

import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

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

async function api<T = unknown>(
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

export default function ChatSettingsPage() {
  const [actions, setActions] = useState<QuickAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditingAction>(EMPTY_ACTION);
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState<EditingAction>(EMPTY_ACTION);

  const fetchActions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<QuickAction[]>('GET');
      setActions(data.sort((a, b) => a.sort_order - b.sort_order));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load quick actions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const startEditing = (action: QuickAction) => {
    setEditingId(action.id);
    setEditForm({ ...action });
    setIsAdding(false);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(EMPTY_ACTION);
  };

  const handleSave = async () => {
    if (!editForm.prompt_text.trim()) {
      toast.error('Prompt text is required');
      return;
    }
    setSaving(editingId);
    try {
      await api('PUT', {
        id: editingId,
        prompt_text: editForm.prompt_text.trim(),
        sort_order: editForm.sort_order,
        is_active: editForm.is_active,
      });
      toast.success('Quick action updated');
      cancelEditing();
      await fetchActions();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setSaving(null);
    }
  };

  const handleAdd = async () => {
    if (!addForm.prompt_text.trim()) {
      toast.error('Prompt text is required');
      return;
    }
    setSaving('new');
    try {
      await api('POST', {
        prompt_text: addForm.prompt_text.trim(),
        sort_order: addForm.sort_order,
        is_active: addForm.is_active,
      });
      toast.success('Quick action created');
      setIsAdding(false);
      setAddForm(EMPTY_ACTION);
      await fetchActions();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await api('DELETE', { id });
      toast.success('Quick action deleted');
      if (editingId === id) cancelEditing();
      await fetchActions();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const handleToggle = async (action: QuickAction) => {
    setSaving(action.id);
    try {
      await api('PUT', {
        id: action.id,
        prompt_text: action.prompt_text,
        sort_order: action.sort_order,
        is_active: !action.is_active,
      });
      toast.success(action.is_active ? 'Quick action disabled' : 'Quick action enabled');
      await fetchActions();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to toggle');
    } finally {
      setSaving(null);
    }
  };

  return (
    <PageLayout>
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-coach-gold/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-coach-gold" />
              </div>
              <div>
                <h1 className="text-3xl font-display font-bold text-foreground">Coach Chat</h1>
                <p className="text-muted-foreground">
                  Manage chat quick actions and view CustomGPT configuration
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Prompts */}
          <Card className="mb-8">
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Quick Action Prompts</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Suggestion buttons shown to users at the start of a chat session
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
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
            </div>

            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-coach-gold" />
                </div>
              ) : actions.length === 0 && !isAdding ? (
                <div className="text-center py-12 text-muted-foreground">
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
                        editingId === action.id
                          ? 'border-coach-gold/50 bg-coach-gold/5'
                          : 'border-border bg-white'
                      )}
                    >
                      {editingId === action.id ? (
                        <div className="p-4 space-y-4">
                          <div className="space-y-2">
                            <Label weight="semibold">Prompt Text</Label>
                            <Input
                              value={editForm.prompt_text}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, prompt_text: e.target.value }))
                              }
                              placeholder="e.g. Help me prepare for a meeting"
                            />
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="space-y-2">
                              <Label weight="semibold">Sort Order</Label>
                              <Input
                                type="number"
                                className="w-24"
                                value={editForm.sort_order}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    sort_order: parseInt(e.target.value, 10) || 0,
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label weight="semibold">Active</Label>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditForm((f) => ({ ...f, is_active: !f.is_active }))
                                }
                                className="flex items-center gap-1.5 pt-1"
                              >
                                {editForm.is_active ? (
                                  <ToggleRight className="w-7 h-7 text-coach-gold" />
                                ) : (
                                  <ToggleLeft className="w-7 h-7 text-muted-foreground" />
                                )}
                                <span className="text-sm text-muted-foreground">
                                  {editForm.is_active ? 'On' : 'Off'}
                                </span>
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-2">
                            <Button
                              size="sm"
                              onClick={handleSave}
                              disabled={saving === editingId}
                              className="bg-coach-gold hover:bg-coach-gold/90 text-white"
                            >
                              {saving === editingId ? (
                                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4 mr-1.5" />
                              )}
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditing}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-4">
                          <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                'text-sm font-medium truncate',
                                action.is_active ? 'text-foreground' : 'text-muted-foreground line-through'
                              )}
                            >
                              {action.prompt_text}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              Order: {action.sort_order}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggle(action)}
                              disabled={saving === action.id}
                              className="p-1.5 rounded-md hover:bg-accent transition-colors"
                            >
                              {saving === action.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                              ) : action.is_active ? (
                                <ToggleRight className="w-5 h-5 text-coach-gold" />
                              ) : (
                                <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => startEditing(action)}
                              className="p-1.5 rounded-md hover:bg-accent transition-colors"
                            >
                              <Pencil className="w-4 h-4 text-muted-foreground" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(action.id)}
                              disabled={deleting === action.id}
                              className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                            >
                              {deleting === action.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-destructive" />
                              ) : (
                                <Trash2 className="w-4 h-4 text-destructive/70" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {isAdding && (
                    <div className="rounded-lg border border-coach-gold/50 bg-coach-gold/5 p-4 space-y-4">
                      <div className="space-y-2">
                        <Label weight="semibold">Prompt Text</Label>
                        <Input
                          value={addForm.prompt_text}
                          onChange={(e) =>
                            setAddForm((f) => ({ ...f, prompt_text: e.target.value }))
                          }
                          placeholder="e.g. Help me prepare for a meeting"
                          autoFocus
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="space-y-2">
                          <Label weight="semibold">Sort Order</Label>
                          <Input
                            type="number"
                            className="w-24"
                            value={addForm.sort_order}
                            onChange={(e) =>
                              setAddForm((f) => ({
                                ...f,
                                sort_order: parseInt(e.target.value, 10) || 0,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label weight="semibold">Active</Label>
                          <button
                            type="button"
                            onClick={() =>
                              setAddForm((f) => ({ ...f, is_active: !f.is_active }))
                            }
                            className="flex items-center gap-1.5 pt-1"
                          >
                            {addForm.is_active ? (
                              <ToggleRight className="w-7 h-7 text-coach-gold" />
                            ) : (
                              <ToggleLeft className="w-7 h-7 text-muted-foreground" />
                            )}
                            <span className="text-sm text-muted-foreground">
                              {addForm.is_active ? 'On' : 'Off'}
                            </span>
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={handleAdd}
                          disabled={saving === 'new'}
                          className="bg-coach-gold hover:bg-coach-gold/90 text-white"
                        >
                          {saving === 'new' ? (
                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4 mr-1.5" />
                          )}
                          Create
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsAdding(false);
                            setAddForm(EMPTY_ACTION);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* CustomGPT Settings */}
          <Card>
            <div className="p-6 border-b border-border/50">
              <h2 className="text-xl font-semibold text-foreground">CustomGPT Settings</h2>
              <p className="text-sm text-muted-foreground mt-1">
                AI model configuration managed via the CustomGPT platform
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Project ID</p>
                  <p className="text-lg font-mono text-coach-mahogany">{PROJECT_ID}</p>
                </div>
                <a
                  href={`https://app.customgpt.ai/projects/${PROJECT_ID}/ask-me-anything`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium',
                    'border border-coach-gold/30 text-coach-mahogany',
                    'hover:bg-coach-gold/10 transition-colors'
                  )}
                >
                  Open Dashboard
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <p className="text-xs text-muted-foreground">
                System prompt, knowledge base, and model parameters are configured directly in the
                CustomGPT dashboard. Changes there take effect immediately for all users.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
