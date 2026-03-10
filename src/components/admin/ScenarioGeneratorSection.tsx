'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Wand2,
  Loader2,
  Copy,
  Rocket,
  CheckCircle,
  AlertCircle,
  Quote,
  Target,
  MessageSquare,
  Lightbulb,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

interface GeneratedScenario {
  title: string;
  personaName: string;
  personaAge: number;
  personaType: string;
  openingLine: string;
  agentSystemPrompt: string;
  scenarioContext: string;
  coachingObjectives: string[];
  suggestedOpeners: string[];
  tip: string;
}

interface SavedScenario {
  id: string;
  title: string;
  persona_id: string;
  difficulty: string;
  primary_skill: string;
  opening_line: string;
  scenario_context: string;
  coaching_objectives: string[];
  suggested_openers: string[];
  elevenlabs_agent_id: string | null;
  created_at: string;
}

const PERSONA_OPTIONS = [
  { value: 'Zoe Chen (Beginner)', label: 'Zoe Chen (Beginner)' },
  { value: 'Maya Torres (Intermediate)', label: 'Maya Torres (Intermediate)' },
  { value: 'Vanessa Liu (Advanced)', label: 'Vanessa Liu (Advanced)' },
  { value: 'Generate New Persona', label: 'Generate New Persona' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'Low pressure', label: 'Low pressure' },
  { value: 'Moderate objections', label: 'Moderate objections' },
  { value: 'High pressure', label: 'High pressure' },
];

const SKILL_OPTIONS = [
  { value: 'Product knowledge', label: 'Product knowledge' },
  { value: 'Objection handling', label: 'Objection handling' },
  { value: 'Upselling', label: 'Upselling' },
  { value: 'Gifting conversation', label: 'Gifting conversation' },
  { value: 'Sustainability story', label: 'Sustainability story' },
  { value: 'New arrival intro', label: 'New arrival intro' },
];

const DIFFICULTY_BADGE: Record<string, string> = {
  Beginner: 'bg-emerald-50 text-emerald-700',
  Intermediate: 'bg-amber-50 text-amber-700',
  Advanced: 'bg-red-50 text-red-700',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function scenarioToClipboardText(s: GeneratedScenario | SavedScenario): string {
  const isGenerated = 'personaName' in s;
  const title = s.title;
  const opening = isGenerated ? s.openingLine : s.opening_line;
  const context = isGenerated ? s.scenarioContext : s.scenario_context;
  const objectives = isGenerated ? s.coachingObjectives : s.coaching_objectives;
  const openers = isGenerated ? s.suggestedOpeners : s.suggested_openers;

  return [
    `SCENARIO: ${title}`,
    '',
    'Customer Opening Line:',
    `"${opening}"`,
    '',
    'Context:',
    context,
    '',
    'Coaching Objectives:',
    ...(objectives || []).map((o: string) => `  • ${o}`),
    '',
    'Suggested Response Openers:',
    ...(openers || []).map((o: string, i: number) => `  ${i + 1}. ${o}`),
  ].join('\n');
}

export function ScenarioGeneratorSection() {
  const { user, isAdmin, loading } = useAdminAuth();

  const [trend, setTrend] = useState('');
  const [persona, setPersona] = useState(PERSONA_OPTIONS[0].value);
  const [difficulty, setDifficulty] = useState(DIFFICULTY_OPTIONS[0].value);
  const [primarySkill, setPrimarySkill] = useState(SKILL_OPTIONS[0].value);

  const [generating, setGenerating] = useState(false);
  const [scenario, setScenario] = useState<GeneratedScenario | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [deploying, setDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);

  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);

  const fetchSaved = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const res = await fetch('/api/admin/scenarios');
      if (res.ok) {
        const data = await res.json();
        setSavedScenarios(Array.isArray(data) ? data : []);
      }
    } catch {
      // silent
    } finally {
      setLoadingSaved(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    setLoadingSaved(true);
    fetchSaved();
  }, [fetchSaved, isAdmin]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trend.trim()) return;

    setGenerating(true);
    setError(null);
    setScenario(null);
    setDeployed(false);

    try {
      const res = await fetch('/api/admin/generate-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trend, persona, difficulty, primarySkill }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to generate scenario');
      }
      setScenario(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate scenario');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (s: GeneratedScenario | SavedScenario) => {
    try {
      await navigator.clipboard.writeText(scenarioToClipboardText(s));
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDeploy = async () => {
    if (!scenario) return;
    setDeploying(true);

    try {
      const res = await fetch('/api/admin/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...scenario,
          difficulty,
          primarySkill,
          trend,
          createdBy: user?.id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to deploy scenario');
      }
      setDeployed(true);
      toast.success('Scenario deployed to Practice Floor');
      fetchSaved();
      setTimeout(() => setDeployed(false), 3000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to deploy scenario');
    } finally {
      setDeploying(false);
    }
  };

  if (loading || !isAdmin) {
    return null;
  }

  const selectClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold';

  return (
    <section className="mt-10">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-coach-mahogany flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-coach-gold" />
          Scenario Generator
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Generate Practice Floor roleplay scenarios from trends, viral moments, or emerging customer questions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-coach-black mb-4">Configure Scenario</h3>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-1.5">
              <Label weight="semibold" size="xs">What&apos;s the trend or moment?</Label>
              <Input
                value={trend}
                onChange={(e) => setTrend(e.target.value)}
                placeholder="e.g. Tabby Shoulder Bag going viral on TikTok, customers asking about Coachtopia sustainability, holiday gifting rush"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label weight="semibold" size="xs">Customer Persona</Label>
              <select
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                className={selectClass}
              >
                {PERSONA_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label weight="semibold" size="xs">Scenario Difficulty</Label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className={selectClass}
              >
                {DIFFICULTY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label weight="semibold" size="xs">Primary Skill to Practice</Label>
              <select
                value={primarySkill}
                onChange={(e) => setPrimarySkill(e.target.value)}
                className={selectClass}
              >
                {SKILL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="submit"
              disabled={generating || !trend.trim()}
              className="w-full bg-coach-black hover:bg-coach-black/90 text-coach-gold font-semibold"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4 mr-2" />
              )}
              Generate Scenario
            </Button>
          </form>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-semibold text-coach-black mb-4">Generated Scenario</h3>

          {generating ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4" />
              <div className="h-16 bg-gray-100 rounded" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-4 bg-gray-100 rounded w-5/6" />
                <div className="h-4 bg-gray-100 rounded w-4/5" />
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-100 rounded w-2/3" />
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
              <p className="text-sm text-gray-400 text-center pt-2">Generating scenario...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center mb-3">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <p className="text-sm font-medium text-red-600 mb-1">Generation failed</p>
              <p className="text-xs text-gray-500 max-w-xs">{error}</p>
            </div>
          ) : scenario ? (
            <div className="space-y-5">
              <div>
                <h4 className="text-lg font-bold text-coach-black">{scenario.title}</h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  {scenario.personaName}, {scenario.personaAge} — {scenario.personaType}
                </p>
              </div>

              <div className="bg-coach-cream/60 rounded-lg p-3 flex items-start gap-2">
                <Quote className="h-4 w-4 text-coach-mahogany flex-shrink-0 mt-0.5" />
                <p className="text-sm italic text-coach-black">&ldquo;{scenario.openingLine}&rdquo;</p>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Context</p>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{scenario.scenarioContext}</p>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Target className="h-3.5 w-3.5 text-gray-400" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Coaching Objectives</p>
                </div>
                <ul className="space-y-1">
                  {scenario.coachingObjectives?.map((objective, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="h-5 w-5 rounded-full bg-coach-gold/10 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-coach-gold">
                        {index + 1}
                      </span>
                      {objective}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-gray-400" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Suggested Openers</p>
                </div>
                <div className="space-y-2">
                  {scenario.suggestedOpeners?.map((opener, index) => (
                    <p key={index} className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                      <span className="font-medium text-coach-mahogany">{index + 1}.</span> {opener}
                    </p>
                  ))}
                </div>
              </div>

              {scenario.tip && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-amber-800">
                    <span className="font-semibold">Tip:</span> {scenario.tip}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(scenario)}
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copy to Clipboard
                </Button>
                <Button
                  size="sm"
                  onClick={handleDeploy}
                  disabled={deploying || deployed}
                  className={cn(
                    'text-white',
                    deployed
                      ? 'bg-emerald-600 hover:bg-emerald-600'
                      : 'bg-coach-gold hover:bg-coach-gold/90'
                  )}
                >
                  {deploying ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : deployed ? (
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                  ) : (
                    <Rocket className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {deployed ? 'Deployed' : 'Deploy to Practice Floor'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <Wand2 className="h-6 w-6 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-400">No scenario yet</p>
              <p className="text-xs text-gray-400 mt-1">Fill in the details and click Generate</p>
            </div>
          )}
        </Card>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-coach-black mb-3">Saved Scenarios</h3>
        {loadingSaved ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-coach-gold" />
          </div>
        ) : savedScenarios.length === 0 ? (
          <Card className="py-12 flex flex-col items-center justify-center text-center">
            <Wand2 className="h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No scenarios deployed yet</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {savedScenarios.map((savedScenario) => (
              <Card key={savedScenario.id} className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-coach-black truncate">{savedScenario.title}</span>
                    <span className={cn(
                      'px-1.5 py-0.5 rounded text-xs font-medium',
                      DIFFICULTY_BADGE[savedScenario.difficulty] || 'bg-gray-100 text-gray-600'
                    )}>
                      {savedScenario.difficulty}
                    </span>
                    {savedScenario.primary_skill && (
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                        {savedScenario.primary_skill}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    <span>{savedScenario.persona_id}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(savedScenario.created_at)}
                    </span>
                    {savedScenario.elevenlabs_agent_id && (
                      <span className="text-emerald-600 font-medium">Live</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleCopy(savedScenario)}
                  title="Copy to clipboard"
                >
                  <Copy className="h-4 w-4 text-gray-400" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
