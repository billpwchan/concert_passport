import { getAccountFromRequest } from '@/lib/server/auth';

export async function GET(request: Request): Promise<Response> {
  return Response.json({ user: getAccountFromRequest(request) ?? null }, {
    headers: { 'cache-control': 'private, no-store' },
  });
}
