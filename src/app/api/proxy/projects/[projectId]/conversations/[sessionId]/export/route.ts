import { NextRequest } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy-handler';

interface Params {
  params: {
    projectId: string;
    sessionId: string;
  };
}

// GET /api/proxy/projects/[projectId]/conversations/[sessionId]/export - Export conversation
export async function GET(request: NextRequest, { params }: Params) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();
  return proxyRequest(
    `/projects/${params.projectId}/conversations/${params.sessionId}/export${query ? `?${query}` : ''}`,
    request
  );
}
