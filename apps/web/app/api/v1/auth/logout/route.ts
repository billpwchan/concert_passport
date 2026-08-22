import { clearBrowserSessionCookie, revokeRequestSession } from '@/lib/server/auth';
import { hasSameOrigin } from '@/lib/server/request-security';

export async function POST(request: Request): Promise<Response> {
  if (!hasSameOrigin(request)) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  revokeRequestSession(request);
  return new Response(null, { status: 204, headers: { 'set-cookie': clearBrowserSessionCookie() } });
}
