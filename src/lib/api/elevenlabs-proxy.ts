/**
 * ElevenLabs API proxy helper
 * Proxies requests to https://api.elevenlabs.io/v1 with xi-api-key server-side.
 * Used for Conversational AI (convai) agents and conversations.
 */

import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

export async function proxyRequestElevenLabs(
  apiPath: string,
  request: NextRequest,
  options: { method?: string; body?: unknown } = {}
) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ELEVENLABS_API_KEY is not configured' },
      { status: 503 }
    );
  }

  const method = options.method || request.method;
  const url = `${ELEVENLABS_BASE}${apiPath}`;
  const headers: Record<string, string> = {
    'xi-api-key': apiKey,
    'Content-Type': 'application/json',
  };

  const fetchOptions: RequestInit = {
    method,
    headers,
    cache: 'no-store',
  };

  if (method !== 'GET' && method !== 'HEAD') {
    if (options.body !== undefined) {
      fetchOptions.body = JSON.stringify(options.body);
    } else {
      try {
        const body = await request.json();
        fetchOptions.body = JSON.stringify(body);
      } catch {
        // no body
      }
    }
  }

  try {
    const res = await fetch(url, fetchOptions);
    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }
    if (!res.ok) {
      return NextResponse.json(data || { error: res.statusText }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('[ElevenLabs Proxy]', apiPath, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Request failed' },
      { status: 500 }
    );
  }
}
