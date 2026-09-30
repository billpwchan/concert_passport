import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { passportInput } from '../lib/domain/passport-input.ts';
process.env.CONCERT_PASSPORT_DB_PATH = join(mkdtempSync(join(tmpdir(), 'cp-passport-')), 'test.sqlite');
const { getDb } = await import('../db/index.ts');
const { createPassportEntry, getPassportEntries, updatePassportEntry, setPassportEntryRemoved, attendSavedEvent } = await import('../db/passport.ts');
const { upsertDiscoveredEvents, saveEventForUser, followArtist, getUserFollows, unfollowArtist } = await import('../db/events.ts');
const { conflictingPerformances } = await import('../lib/collection/conflicts.ts');
const user = {userId:'journal-owner',email:'owner@example.test',displayName:'Owner'};
const input = {artist:'IU',city:'Singapore',market:'SG',attendedAt:'2026-01-03',travelDistanceKm:12};

test('manual memories validate shape and real calendar dates without inventing a time', () => {
  assert.deepEqual(passportInput(input), {...input, eventName: undefined, venue: undefined});
  for (const bad of [null, [], {...input,artist:{}}, {...input,attendedAt:'2026-02-31'}, {...input,attendedAt:'2026-02-31T12:00:00Z'}, {...input,attendedAt:'2026-01-03T24:00:00Z'}, {...input,attendedAt:'2099-01-01'}, {...input,travelDistanceKm:'12'}, {...input,travelDistanceKm:Infinity}, {...input,market:'ZZ'}, {...input,artist:'x'.repeat(101)}]) assert.equal(passportInput(bad), undefined);
});
test('private record editing, recoverable removal and export selection respect ownership', async () => {
  const id = await createPassportEntry({user,...input});
  assert.equal(updatePassportEntry('other-user',id,{...input,artist:'wrong'}), false);
  assert.equal(setPassportEntryRemoved('other-user',id,true), false);
  assert.equal(updatePassportEntry(user.userId,id,{...input,venue:'The Star'}), true);
  assert.equal(getPassportEntries(user.userId)[0].venue, 'The Star');
  assert.equal(getPassportEntries(user.userId)[0].attendedAt, '2026-01-03');
  setPassportEntryRemoved(user.userId,id,true);
  assert.equal(getPassportEntries(user.userId).length, 0);
  setPassportEntryRemoved(user.userId,id,false);
  assert.equal(getPassportEntries(user.userId).length, 1);
});
test('saved-to-attended is retry safe and rejects unsaved, future or stopped shows', async () => {
  const event = {provider:'test',providerEventId:'journal-show',name:'IU Test',artist:'IU',startsAt:'2026-01-01T20:00:00+08:00',timezone:'Asia/Singapore',city:'Singapore',venue:'The Star Theatre',countryCode:'SG',officialUrl:'https://example.test/1',confidence:'official' as const};
  const id = upsertDiscoveredEvents([event])[0].canonicalId!;
  assert.equal(attendSavedEvent(user.userId,id), undefined);
  await saveEventForUser({user,eventId:id});
  const first = attendSavedEvent(user.userId,id)!;
  assert.ok(first); assert.equal(attendSavedEvent(user.userId,id), first);
  setPassportEntryRemoved(user.userId,first,true);
  assert.equal(attendSavedEvent(user.userId,id), first);
  assert.equal(getPassportEntries(user.userId).filter(e=>e.eventId===id).length,1);
  assert.equal(attendSavedEvent('other-user',id), undefined);
  assert.equal(attendSavedEvent(user.userId,id,Date.UTC(2020,1,1)), undefined);
  assert.equal(conflictingPerformances({...event,provider:'other',startsAt:'2026-01-01T20:30:00+08:00'})[0],id);
  assert.deepEqual(conflictingPerformances({...event,provider:'other',startsAt:'2026-01-01T14:00:00+08:00'}),[]);
  getDb().prepare("UPDATE canonical_events SET lifecycle_status='cancelled' WHERE id=?").run(id);
  assert.equal(attendSavedEvent(user.userId,id),undefined);
  assert.deepEqual(getDb().prepare('PRAGMA foreign_key_check').all(),[]);
});
test('follow removal is user scoped and case insensitive', async () => {
  await followArtist({user,artist:'aespa',market:'ALL'});
  unfollowArtist('other-user','aespa','ALL'); assert.equal(getUserFollows(user.userId).length,1);
  unfollowArtist(user.userId,'AESPA','ALL'); assert.equal(getUserFollows(user.userId).length,0);
});

test('account merge keeps both memories without violating unique source links', async () => {
  const { mergeAnonymousState } = await import('../db/auth.ts');
  const other = {userId:'journal-account',email:'account@example.test',displayName:'Account'};
  const eventId = (getDb().prepare("SELECT id FROM canonical_events WHERE provider_event_id='journal-show'").get() as {id:string}).id;
  getDb().prepare("UPDATE canonical_events SET lifecycle_status='scheduled' WHERE id=?").run(eventId);
  await saveEventForUser({user:other,eventId});
  attendSavedEvent(other.userId,eventId);
  mergeAnonymousState(user.userId,other.userId);
  assert.equal(getPassportEntries(other.userId).length,3);
  assert.equal(getPassportEntries(user.userId).length,0);
  assert.deepEqual(getDb().prepare('PRAGMA foreign_key_check').all(),[]);
});
test('map uses documented city approximations without inventing venue precision', async () => {
  const { eventLocation } = await import('../lib/domain/event-location.ts');
  assert.equal(eventLocation({city:'Singapore',countryCode:'SG'})?.precision,'city');
  assert.equal(eventLocation({city:'Singapore',countryCode:'JP'}),undefined);
  assert.equal(eventLocation({city:'台北市',countryCode:'TW'})?.precision,'city');
  assert.equal(eventLocation({city:'Unknown',countryCode:'SG'}),undefined);
  assert.equal(eventLocation({latitude:1.3,longitude:103.8})?.precision,'venue');
  assert.equal(eventLocation({latitude:300,longitude:103.8}),undefined);
});
test('announcement decoding preserves tour brackets but removes markup', async () => {
  const { announcementText } = await import('../lib/collection/plain-text.ts');
  assert.equal(announcementText('<p>ITZY &lt;TUNNEL VISION&gt;&nbsp;<br>Live</p>'), 'ITZY <TUNNEL VISION> Live');
});

test('legacy venue aliases with different times are flagged without changing or merging records', async () => {
  const { getCanonicalEvent } = await import('../db/events.ts');
  const { hasTimingConflict } = await import('../lib/collection/conflicts.ts');
  const { hasConfirmedPerformanceTime } = await import('../lib/domain/discovery.ts');
  const base = {provider:'legacy-test',name:'XLOV Live',artist:'XLOV',countryCode:'SG',officialUrl:'https://example.test/xlov',confidence:'official' as const};
  const first = upsertDiscoveredEvents([{...base,providerEventId:'legacy-one',startsAt:'2026-10-01T19:00:00+08:00',venue:'The Star Theatre'}])[0].canonicalId!;
  const second = upsertDiscoveredEvents([{...base,providerEventId:'legacy-two',startsAt:'2026-10-01T19:30:00+08:00',venue:'The Star Performing Arts Centre'}])[0].canonicalId!;
  assert.notEqual(first,second);
  for (const id of [first,second]) {
    assert.equal(hasTimingConflict(id),true);
    assert.equal(getCanonicalEvent(id)?.timingConflict,true);
    assert.equal(hasConfirmedPerformanceTime(getCanonicalEvent(id)!),false);
  }
  assert.match(getCanonicalEvent(first)!.startsAt,/19:00/);
  getDb().prepare("UPDATE canonical_events SET lifecycle_status='cancelled' WHERE id=?").run(second);
  assert.equal(hasTimingConflict(first),false);
});
