export const dynamic = 'force-dynamic';

export async function POST(): Promise<Response> {
  return Response.json({
    status: 'automatic_only',
    detail: 'Official source discovery and validation run automatically after every catalog update.',
  }, { status: 410 });
}
