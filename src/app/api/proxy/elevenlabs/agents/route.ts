import { NextRequest } from 'next/server';
import { proxyRequestElevenLabs } from '@/lib/api/elevenlabs-proxy';

// GET /api/proxy/elevenlabs/agents - List all convai agents
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();
  return proxyRequestElevenLabs(`/convai/agents${query ? `?${query}` : ''}`, request);
}
