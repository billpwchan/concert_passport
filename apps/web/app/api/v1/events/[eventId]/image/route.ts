import { getEventImageSource, getEventVisualFallback } from '@/db/media';
import { isEventPublicationQuarantined } from '@/db/events';
import { proxyRemoteMediaImage } from '@/lib/server/remote-image';
import { fallbackVisualResponse } from '@/lib/server/visual-fallback';

export const revalidate = 86_400;

export async function GET(
  _request: Request,
  context: { params: Promise<{ eventId: string }> },
): Promise<Response> {
  const eventId = decodeURIComponent((await context.params).eventId);
  if (isEventPublicationQuarantined(eventId)) {
    return fallbackVisualResponse({ artist: 'Concert Passport', localDate: 'Review' });
  }
  const source = getEventImageSource(eventId);
  if (source) {
    const response = await proxyRemoteMediaImage(source);
    if (response.ok) return response;
  }
  const event = getEventVisualFallback(eventId);
  return event ? fallbackVisualResponse(event) : new Response(null, { status: 404 });
}
