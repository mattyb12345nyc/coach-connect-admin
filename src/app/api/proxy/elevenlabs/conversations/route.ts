import { NextRequest } from 'next/server';
import { proxyRequestElevenLabs } from '@/lib/api/elevenlabs-proxy';

// GET /api/proxy/elevenlabs/conversations?agent_id=... - List conversations for an agent
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();
  return proxyRequestElevenLabs(`/convai/conversations${query ? `?${query}` : ''}`, request);
}
