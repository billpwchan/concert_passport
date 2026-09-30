import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
// Always allocate a new database. Never honor a production DB path in demo mode.
const dir = mkdtempSync(join(tmpdir(), 'concert-passport-demo-'));
process.env.CONCERT_PASSPORT_DB_PATH = join(dir, 'demo.sqlite');
process.env.CONCERT_PASSPORT_DATA_MODE = 'official';
process.env.CONCERT_PASSPORT_DEMO = '1';
process.env.CONCERT_PASSPORT_SITE_URL = 'http://localhost:3106';
for (const key of ['INGESTION_CRON_SECRET','TICKETMASTER_API_KEY','PREDICTHQ_ACCESS_TOKEN','BRAVE_SEARCH_API_KEY','SEARXNG_URL']) process.env[key] = ''; // Empty values prevent Next from reloading real .env.local credentials.
const { upsertDiscoveredEvents } = await import('../db/events.ts');
const anchor = new Date(process.env.DEMO_DATE ?? new Date().toISOString().slice(0,10));
if (!Number.isFinite(anchor.getTime())) throw new Error('DEMO_DATE must be a valid ISO date');
const acts = ['aespa','IU','TWICE','SEVENTEEN','ITZY','IVE'];
const cities = ['Singapore','Taipei','Seoul','Tokyo','Bangkok','Hong Kong'];
const markets = ['SG','TW','KR','JP','TH','HK'];
const coordinates = [[1.3,103.8],[25.03,121.56],[37.56,126.97],[35.68,139.69],[13.75,100.5],[22.3,114.17]];
upsertDiscoveredEvents(acts.map((artist,i)=>({provider:'demo',providerEventId:`demo-${i}`,artist,name:`DEMO · ${artist} · Fictional tour`,startsAt:new Date(anchor.getTime()+(i*7+3)*86400000+12*3600000).toISOString(),timezone:'Asia/Singapore',venue:'Demo Arena',city:cities[i],countryCode:markets[i],latitude:coordinates[i][0],longitude:coordinates[i][1],officialUrl:'https://example.invalid/demo',confidence:'community'})));
console.log(`Isolated fictional demo: http://localhost:3106\nDatabase: ${process.env.CONCERT_PASSPORT_DB_PATH}\nNo ingestion worker is started.`);
const child = spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3106'],{stdio:'inherit',env:process.env});
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??0));
