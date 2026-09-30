import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { collectionSources, discoverPageLinks } from '../lib/collection/manifest.ts';
import { sitemapLinks, starVenueNodes } from '../lib/collection/public-pages.ts';
import { extractOfficialEvents } from '../lib/collection/parser.ts';
import { classifySourceFailure, pageRefreshDelay, sourceRetryDelay } from '../lib/collection/policy.ts';
import { retryAfterDelay } from '../lib/collection/http.ts';
import { dataMode } from '../lib/sources/data-mode.ts';

process.env.CONCERT_PASSPORT_DB_PATH = join(tmpdir(), `cp-keyless-${crypto.randomUUID()}.sqlite`);
const star = collectionSources.find(source => source.id === 'official:the-star-sg')!;
const url = 'https://www.thestar.sg/events/2026-xlov-asia-tour-serving-x-in-singapore';
const fixture = readFileSync(new URL('./fixtures/collection/star-xlov-sg.html', import.meta.url), 'utf8');

test('default official mode makes no commercial requests even with stale credentials', async () => {
  const original = globalThis.fetch;
  const previous = {...process.env};
  globalThis.fetch = async () => { throw new Error('Unexpected network request'); };
  process.env.TICKETMASTER_API_KEY = 'stale-test-key';
  process.env.PREDICTHQ_ACCESS_TOKEN = 'stale-test-token';
  delete process.env.CONCERT_PASSPORT_DATA_MODE;
  try {
    const {ticketmasterConfigured, ticketmasterRequest} = await import('../lib/sources/ticketmaster-client.ts');
    const {predictHqAdapter, fetchPredictHqChanges} = await import('../lib/sources/adapters/predicthq.ts');
    assert.equal(dataMode(), 'official');
    assert.equal(ticketmasterConfigured(), false);
    assert.equal(await ticketmasterRequest('/discovery/v2/events.json', new URLSearchParams()), undefined);
    assert.deepEqual(await predictHqAdapter.discover({}), []);
    assert.equal((await fetchPredictHqChanges({})).configured, false);
    process.env.CONCERT_PASSPORT_DATA_MODE = 'typo';
    assert.equal(ticketmasterConfigured(), false);
    process.env.CONCERT_PASSPORT_DATA_MODE = 'hybrid';
    assert.equal(ticketmasterConfigured(), true);
  } finally {
    globalThis.fetch = original;
    for (const key of ['TICKETMASTER_API_KEY','PREDICTHQ_ACCESS_TOKEN','CONCERT_PASSPORT_DATA_MODE']) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  }
});

test('real venue fixture reads the visible performance clock, venue, poster and seller', () => {
  const result = extractOfficialEvents(fixture, url, star);
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].event.startsAt, '2026-10-01T20:00:00+08:00');
  assert.equal(result.events[0].event.venue, 'The Star Theatre');
  assert.equal(result.events[0].event.timezone, 'Asia/Singapore');
  assert.equal(result.events[0].offerUrl, 'https://www.sistic.com.sg/events/xlov1026');
  assert.match(result.events[0].event.imageUrl!, /^https:\/\/cdn.prod.website-files.com\//);
  assert.equal(result.events[0].precision, 'time');
});

test('venue parser rejects template drift, invalid clocks and unresolved ranges', () => {
  assert.deepEqual(starVenueNodes(fixture.replace('>Date<', '>Start<'), url), []);
  assert.deepEqual(starVenueNodes(fixture.replaceAll('8:00 pm', '18:00 pm'), url), []);
  assert.deepEqual(starVenueNodes(fixture.replaceAll('October 1, 2026', 'February 31, 2026'), url), []);
  assert.deepEqual(starVenueNodes(fixture.replace('class="event-header"', 'class="new-header"'), url), []);
  assert.deepEqual(starVenueNodes(fixture, 'https://attacker.example/events/1'), []);
});

test('HTML and XML discovery decode links but cannot expand beyond source boundaries', () => {
  assert.deepEqual(discoverPageLinks('<a href=/events/a?utm_source=x>A</a><a href="/checkout">No</a>', url, star), ['https://www.thestar.sg/events/a']);
  assert.deepEqual(sitemapLinks('<urlset><url><loc>https://www.thestar.sg/events/a</loc></url><url><loc>https://evil.test/events/x</loc></url><url><loc>https://www.thestar.sg/login</loc></url></urlset>', star), [{url:'https://www.thestar.sg/events/a',kind:'event'}]);
  assert.deepEqual(sitemapLinks('<sitemapindex><sitemap><loc>https://www.thestar.sg/events-map.xml</loc></sitemap></sitemapindex>', star), [{url:'https://www.thestar.sg/events-map.xml',kind:'sitemap'}]);
  assert.throws(() => sitemapLinks('<!DOCTYPE x [<!ENTITY x SYSTEM "file:///secret">]><urlset/>', star), /unsupported_xml/);
  assert.throws(() => sitemapLinks('<html>Access denied</html>', star), /sitemap schema/);
});

test('source scope is enforced by the persistent queue, not just initial seeding', async () => {
  const {enqueuePage, claimPage, finishPage} = await import('../db/collection.ts');
  enqueuePage({url, sourceId:star.id, market:'SG',kind:'event',depth:1}, 1000);
  enqueuePage({url:'https://www.livenation.sg/event/other',sourceId:'official:livenation-sg',market:'SG',kind:'event',depth:1}, 1000);
  assert.equal(claimPage(1001, []), undefined);
  const lease = claimPage(1001, [star.id])!;
  assert.equal(lease.url, url);
  finishPage(lease, {status:200,nextAt:1000000}, 1001);
  assert.equal(claimPage(1002, [star.id]), undefined);
});

test('sale windows and historical pages get distinct refresh schedules; server cooldown wins', () => {
  const now = Date.parse('2026-09-30T00:00:00Z');
  const future = '2027-03-01T00:00:00Z';
  assert.equal(pageRefreshDelay(future, now), 6 * 3600000);
  assert.equal(pageRefreshDelay(future, now, '2026-09-30T01:00:00Z'), 5 * 60000);
  assert.equal(pageRefreshDelay(future, now, '2026-09-30T05:00:00Z'), 3 * 3600000);
  assert.equal(pageRefreshDelay('2026-09-01', now), 7 * 86400000);
  assert.equal(classifySourceFailure('http_403'), 'blocked');
  assert.equal(classifySourceFailure('http_401'), 'authentication');
  assert.equal(retryAfterDelay('900', now), 900000);
  assert.equal(retryAfterDelay('Wed, 30 Sep 2026 01:00:00 GMT', now), 3600000);
  assert.equal(retryAfterDelay('invalid', now), undefined);
  assert.equal(sourceRetryDelay('rate_limited', 1, 3600000), 3600000);
});

test('page refusals preserve a working source, while rate limits defer the entire source', async () => {
  const {recordSourceOutcome, sourceReady} = await import('../db/collection.ts');
  const {getDb} = await import('../db/index.ts');
  recordSourceOutcome(star.id, {count:1}, 10000);
  recordSourceOutcome(star.id, {error:'http_403', pageOnly:true}, 11000);
  assert.equal(sourceReady(star.id, 11001), true);
  const state = getDb().prepare('SELECT status,last_success_at FROM source_runtime WHERE source_id=?').get(star.id);
  assert.equal(state?.status, 'partial');
  assert.equal(state?.last_success_at, 10000);
  recordSourceOutcome(star.id, {error:'http_429', retryAfterMs:3600000}, 12000);
  assert.equal(sourceReady(star.id, 12001), false);
  assert.equal(sourceReady(star.id, 3612000), true);
});

test('collector does not mistake escaped HTML inside a JSON index for discovery links', async () => {
  const {getDb} = await import('../db/index.ts');
  const {runOfficialCollection, seedOfficialFrontier} = await import('../lib/collection/runner.ts');
  const sourceId = 'official:livenation-tw';
  seedOfficialFrontier([sourceId]);
  const db = getDb();
  db.prepare('UPDATE collection_frontier SET next_check_at=? WHERE source_id=?').run(Date.now()+86400000, sourceId);
  db.prepare("UPDATE collection_frontier SET next_check_at=0 WHERE source_id=? AND url LIKE '%/api/search/events%'").run(sourceId);
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => String(input).endsWith('/robots.txt')
    ? new Response('', {status:404})
    : Response.json({documents:[],total:0, description:'<a href="https://tixcraft.com/activity/detail/show">Tickets</a>'});
  try {
    const result = await runOfficialCollection({sourceIds:[sourceId],limit:1});
    assert.equal(result.failed, 0);
    assert.equal(result.queued, 0);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM collection_frontier WHERE url LIKE '%22https%'").get()?.n, 0);
  } finally { globalThis.fetch = original; }
});
