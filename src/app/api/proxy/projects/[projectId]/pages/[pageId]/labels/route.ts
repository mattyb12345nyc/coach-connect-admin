import { NextRequest } from 'next/server';
import { proxyRequest } from '@/lib/api/proxy-handler';

interface Params {
  params: { projectId: string; pageId: string };
}

// GET /api/proxy/projects/[projectId]/pages/[pageId]/labels - Get document labels
export async function GET(request: NextRequest, { params }: Params) {
  return proxyRequest(
    `/projects/${params.projectId}/pages/${params.pageId}/labels`,
    request
  );
}
