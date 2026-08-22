import { submitSource } from '@/db/repository';
import { getPrivateSession } from '@/lib/server/session';
import { isVerifiedOfficialHost } from '@/lib/sources/registry';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const session = getPrivateSession(request);

  const body = (await request.json()) as { url?: string };
  let sourceUrl: URL;
  try {
    sourceUrl = new URL(body.url ?? '');
  } catch {
    return Response.json({ error: 'A valid official URL is required' }, { status: 400 });
  }
  if (sourceUrl.protocol !== 'https:') {
    return Response.json({ error: 'Official sources must use HTTPS' }, { status: 400 });
  }

  const id = await submitSource({
    user: session.user,
    url: sourceUrl.toString(),
    host: sourceUrl.hostname,
  });
  const response = Response.json(
    { id, status: 'pending', knownOfficialHost: isVerifiedOfficialHost(sourceUrl.hostname) },
    { status: 201 },
  );
  if (session.setCookie) response.headers.set('set-cookie', session.setCookie);
  return response;
}
