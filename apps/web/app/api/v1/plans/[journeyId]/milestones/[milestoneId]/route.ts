import { getChatGPTUser } from '@/app/chatgpt-auth';
import { setMilestoneState } from '@/db/repository';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ journeyId: string; milestoneId: string }> },
): Promise<Response> {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });

  const body = (await request.json()) as { state?: string };
  if (body.state !== 'todo' && body.state !== 'completed' && body.state !== 'skipped') {
    return Response.json({ error: 'Invalid milestone state' }, { status: 400 });
  }

  const { journeyId, milestoneId } = await context.params;
  await setMilestoneState({
    user: { userId: user.userId, email: user.email, displayName: user.displayName },
    journeyId,
    milestoneId,
    state: body.state,
  });

  return Response.json({ journeyId, milestoneId, state: body.state });
}
