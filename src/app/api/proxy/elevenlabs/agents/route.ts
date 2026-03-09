import { NextRequest } from 'next/server';
import { proxyRequestElevenLabs } from '@/lib/api/elevenlabs-proxy';

// GET /api/proxy/elevenlabs/agents - List all convai agents
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();
  return proxyRequestElevenLabs(`/convai/agents${query ? `?${query}` : ''}`, request);
}

// POST /api/proxy/elevenlabs/agents - Create a new convai agent
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return proxyRequestElevenLabs('/convai/agents', request, {
    method: 'POST',
    body,
  });
}
