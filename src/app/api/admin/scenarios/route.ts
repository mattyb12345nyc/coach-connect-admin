/*
  Supabase migration — run manually before first use:

  create table if not exists scenarios (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    opening_line text not null,
    scenario_context text not null,
    coaching_objectives jsonb not null default '[]',
    suggested_openers jsonb not null default '[]',
    agent_system_prompt text,
    persona_id text not null,
    difficulty text not null,
    primary_skill text not null,
    trend_input text not null,
    elevenlabs_agent_id text,
    created_by uuid references auth.users(id),
    created_at timestamptz not null default now()
  );
  alter table scenarios enable row level security;
  create policy "Service role full access" on scenarios for all using (true) with check (true);
*/

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

const REFERENCE_AGENTS: Record<string, string> = {
  Beginner: 'agent_8901kgmmeyptf96tyqky6fm6qy13',
  Intermediate: 'agent_5201kgmpk85hekj9g3vsss6r7zcg',
  Advanced: 'agent_9101kgmprab4ewfaxnvw02ykbs6g',
};

const DIFFICULTY_MAP: Record<string, string> = {
  'Low pressure': 'Beginner',
  'Moderate objections': 'Intermediate',
  'High pressure': 'Advanced',
};

async function elevenLabsFetch(path: string, options: RequestInit = {}) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not configured');
  return fetch(`${ELEVENLABS_BASE}${path}`, {
    ...options,
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

export async function GET() {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('scenarios')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let createdAgentId: string | null = null;

  try {
    const body = await request.json();
    const {
      title, personaName, personaAge, personaType, openingLine,
      agentSystemPrompt, scenarioContext, coachingObjectives,
      suggestedOpeners, tip, difficulty, primarySkill, trend,
      createdBy,
    } = body;

    if (!title || !openingLine || !agentSystemPrompt) {
      return NextResponse.json(
        { error: 'Title, opening line, and agent system prompt are required' },
        { status: 400 }
      );
    }

    const difficultyLevel = DIFFICULTY_MAP[difficulty] || 'Beginner';
    const referenceAgentId = REFERENCE_AGENTS[difficultyLevel];

    // Step 1: Fetch voice_id from reference agent
    let voiceId: string | undefined;
    try {
      const refRes = await elevenLabsFetch(`/convai/agents/${referenceAgentId}`);
      if (refRes.ok) {
        const refAgent = await refRes.json();
        voiceId = refAgent?.conversation_config?.tts?.voice_id;
      }
    } catch {
      // Fall through — agent will use ElevenLabs default voice
    }

    // Step 2: Create new ElevenLabs agent
    const agentPayload: Record<string, unknown> = {
      name: `${personaName || 'Customer'} — ${title}`,
      conversation_config: {
        agent: {
          first_message: openingLine,
          prompt: {
            prompt: agentSystemPrompt,
            llm: 'claude-sonnet-4-20250514',
            temperature: 0.7,
          },
          language: 'en',
        },
        ...(voiceId ? { tts: { voice_id: voiceId } } : {}),
        conversation: { max_duration_seconds: 600 },
      },
    };

    const createRes = await elevenLabsFetch('/convai/agents', {
      method: 'POST',
      body: JSON.stringify(agentPayload),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error('[scenarios] ElevenLabs create agent error:', createRes.status, errText);
      return NextResponse.json(
        { error: `Failed to create ElevenLabs agent (${createRes.status})` },
        { status: 502 }
      );
    }

    const newAgent = await createRes.json();
    createdAgentId = newAgent.agent_id;

    if (!createdAgentId) {
      return NextResponse.json(
        { error: 'ElevenLabs returned no agent_id' },
        { status: 502 }
      );
    }

    // Step 3: Insert into practice_personas
    const supabase = getAdminClient();

    const { data: maxOrder } = await supabase
      .from('practice_personas')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxOrder?.sort_order ?? 0) + 1;

    const { error: personaError } = await supabase
      .from('practice_personas')
      .insert({
        name: personaName || 'New Persona',
        age: personaAge || 25,
        type: personaType || 'Customer',
        scenario: title,
        difficulty: difficultyLevel,
        agent_id: createdAgentId,
        tip: tip || null,
        is_active: true,
        sort_order: nextOrder,
      });

    if (personaError) {
      console.error('[scenarios] practice_personas insert error:', personaError);
      await elevenLabsFetch(`/convai/agents/${createdAgentId}`, { method: 'DELETE' }).catch(() => {});
      return NextResponse.json(
        { error: `Failed to save persona: ${personaError.message}` },
        { status: 500 }
      );
    }

    // Step 4: Insert into scenarios table
    const { data: scenario, error: scenarioError } = await supabase
      .from('scenarios')
      .insert({
        title,
        opening_line: openingLine,
        scenario_context: scenarioContext || '',
        coaching_objectives: coachingObjectives || [],
        suggested_openers: suggestedOpeners || [],
        agent_system_prompt: agentSystemPrompt,
        persona_id: personaName || 'unknown',
        difficulty: difficultyLevel,
        primary_skill: primarySkill || '',
        trend_input: trend || '',
        elevenlabs_agent_id: createdAgentId,
        created_by: createdBy || null,
      })
      .select()
      .single();

    if (scenarioError) {
      console.error('[scenarios] scenarios insert error:', scenarioError);
      // Persona was already created — don't roll back, just warn
    }

    return NextResponse.json({
      success: true,
      agentId: createdAgentId,
      scenario: scenario || null,
    }, { status: 201 });
  } catch (e: unknown) {
    // Best-effort cleanup if agent was created before the error
    if (createdAgentId) {
      await elevenLabsFetch(`/convai/agents/${createdAgentId}`, { method: 'DELETE' }).catch(() => {});
    }
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[scenarios]', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
