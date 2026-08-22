import { setMilestoneState } from '@/db/repository';
import { getPrivateSession } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ journeyId: string; milestoneId: string }> },
): Promise<Response> {
  const session = getPrivateSession(request);

  const body = (await request.json()) as { state?: string };
  if (body.state !== 'todo' && body.state !== 'completed' && body.state !== 'skipped') {
    return Response.json({ error: 'Invalid milestone state' }, { status: 400 });
  }

  const { journeyId, milestoneId } = await context.params;
  await setMilestoneState({
    user: session.user,
    journeyId,
    milestoneId,
    state: body.state,
  });

  const response = Response.json({ journeyId, milestoneId, state: body.state });
  if (session.setCookie) response.headers.set('set-cookie', session.setCookie);
  return response;
}
