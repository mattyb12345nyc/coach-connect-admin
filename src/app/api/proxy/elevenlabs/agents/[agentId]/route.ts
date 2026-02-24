import { NextRequest } from 'next/server';
import { proxyRequestElevenLabs } from '@/lib/api/elevenlabs-proxy';

interface Params {
  agentId: string;
}

// GET /api/proxy/elevenlabs/agents/[agentId] - Get agent config
export async function GET(request: NextRequest, { params }: { params: Params }) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();
  return proxyRequestElevenLabs(
    `/convai/agents/${params.agentId}${query ? `?${query}` : ''}`,
    request
  );
}

// PATCH /api/proxy/elevenlabs/agents/[agentId] - Update agent config
export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return proxyRequestElevenLabs(`/convai/agents/${params.agentId}`, request, {
    method: 'PATCH',
    body,
  });
}
