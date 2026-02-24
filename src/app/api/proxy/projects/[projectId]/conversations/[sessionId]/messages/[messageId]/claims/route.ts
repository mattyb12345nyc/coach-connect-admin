import { NextRequest } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy-handler';

interface Params {
  projectId: string;
  sessionId: string;
  messageId: string;
}

// GET /api/proxy/projects/.../messages/[messageId]/claims - Get message claims
export async function GET(request: NextRequest, { params }: { params: Params }) {
  return proxyRequest(
    `/projects/${params.projectId}/conversations/${params.sessionId}/messages/${params.messageId}/claims`,
    request
  );
}
