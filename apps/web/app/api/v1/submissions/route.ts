import { getChatGPTUser } from '@/app/chatgpt-auth';
import { submitSource } from '@/db/repository';
import { isVerifiedOfficialHost } from '@/lib/sources/registry';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });

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
    user: { userId: user.userId, email: user.email, displayName: user.displayName },
    url: sourceUrl.toString(),
    host: sourceUrl.hostname,
  });
  return Response.json(
    { id, status: 'pending', knownOfficialHost: isVerifiedOfficialHost(sourceUrl.hostname) },
    { status: 201 },
  );
}
