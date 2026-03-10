import { NextRequest, NextResponse } from 'next/server';
import { getValidatedAdminUser } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `You are a retail training designer for Coach, the luxury fashion brand.
Generate a realistic sales roleplay scenario for store associates based on the inputs provided.
The scenario should feel authentic to a Coach retail environment and help associates practice handling real customer situations.

Return ONLY a JSON object with these exact fields:
{
  "title": "short scenario title",
  "personaName": "customer full name",
  "personaAge": number,
  "personaType": "brief customer archetype, e.g. First-Time Buyer",
  "openingLine": "what the customer says when they approach the associate",
  "agentSystemPrompt": "a detailed system prompt (3-5 paragraphs) instructing an AI to roleplay as this customer. Include personality traits, backstory, shopping goals, objection style, emotional state, specific product interests, and how to escalate difficulty naturally. The AI should never break character or acknowledge it is an AI.",
  "scenarioContext": "2-3 sentences of background for the training admin",
  "coachingObjectives": ["objective 1", "objective 2", "objective 3"],
  "suggestedOpeners": ["suggested associate response 1", "suggested associate response 2"],
  "tip": "one-sentence coaching tip for the associate"
}

No preamble, no markdown, no explanation — JSON only.`;

export async function POST(request: NextRequest) {
  const adminUser = await getValidatedAdminUser(request);
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured' },
        { status: 503 }
      );
    }

    const { trend, persona, difficulty, primarySkill } = await request.json();

    if (!trend || !difficulty || !primarySkill) {
      return NextResponse.json(
        { error: 'Trend, difficulty, and primary skill are required' },
        { status: 400 }
      );
    }

    const userMessage = `Trend or moment: ${trend}
Persona: ${persona || 'Generate a new persona'}
Scenario difficulty: ${difficulty}
Primary skill to practice: ${primarySkill}

Generate a scenario.`;

    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('[generate-scenario] Claude API error:', res.status, errBody);
      return NextResponse.json(
        { error: `Claude API error (${res.status})` },
        { status: 502 }
      );
    }

    const result = await res.json();
    const textBlock = result.content?.find(
      (b: { type: string }) => b.type === 'text'
    );

    if (!textBlock?.text) {
      return NextResponse.json(
        { error: 'Empty response from Claude' },
        { status: 502 }
      );
    }

    const scenario = JSON.parse(textBlock.text);
    return NextResponse.json(scenario);
  } catch (e: unknown) {
    console.error('[generate-scenario]', e);
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
