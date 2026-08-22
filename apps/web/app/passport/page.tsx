import { PageHeader } from '@/components/page-header';
import { demoAttendances } from '@/lib/domain/demo';
import { sumDistanceKm } from '@/lib/domain/lifecycle';

export const metadata = {
  title: 'Passport — Concert Passport',
  description: 'Your lifetime of live music, mapped and remembered.',
};

export default function PassportPage() {
  const distance = sumDistanceKm(demoAttendances);
  const artists = new Set(demoAttendances.map((item) => item.artist.id)).size;
  const cities = new Set(demoAttendances.map((item) => item.city)).size;
  const years = demoAttendances.map((item) => new Date(item.attendedAt).getFullYear());

  return (
    <>
      <PageHeader
        eyebrow="LIFETIME PASSPORT"
        title="You went for the music. The map kept the story."
        description="A private-by-default archive of every artist, city, route, and first time."
      />
      <section className="passport-page">
        <div className="passport-cover">
          <div className="passport-cover-head"><span>CONCERT</span><strong>PASSPORT</strong><small>ISSUED TO · BILL</small></div>
          <div className="passport-worldmark" aria-hidden="true"><i /><i /><i /></div>
          <div className="passport-number">CP · 000018</div>
        </div>

        <div className="passport-identity">
          <div className="identity-title"><span>LIVE MUSIC TRAVEL DOCUMENT</span><strong>BILL</strong><small>HOME · SINGAPORE</small></div>
          <dl>
            <div><dt>SHOWS</dt><dd>18</dd></div>
            <div><dt>ARTISTS</dt><dd>{artists}</dd></div>
            <div><dt>CITIES</dt><dd>{cities}</dd></div>
            <div><dt>DISTANCE</dt><dd>{distance.toLocaleString()} <small>KM</small></dd></div>
            <div><dt>FIRST STAMP</dt><dd>{Math.min(...years)}</dd></div>
            <div><dt>LATEST STAMP</dt><dd>{Math.max(...years)}</dd></div>
          </dl>
          <p>“Every ticket window became a route. Every route became a memory.”</p>
        </div>

        <div className="passport-stamps">
          <div className="stamps-heading"><span>04 SELECTED STAMPS</span><strong>First seen live</strong></div>
          <div className="stamp-grid">
            {demoAttendances.map((attendance, index) => (
              <article className="passport-stamp" style={{ '--stamp-color': attendance.accent, '--stamp-rotation': `${index % 2 ? 4 : -5}deg` } as React.CSSProperties} key={attendance.id}>
                <span>LIVE · {attendance.market}</span>
                <strong>{attendance.city.toUpperCase()}</strong>
                <small>{new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(attendance.attendedAt)).toUpperCase()}</small>
                <i>{attendance.artist.name}</i>
              </article>
            ))}
          </div>
        </div>

        <div className="artist-timeline">
          <div><p className="eyebrow">ARTIST TIMELINE</p><h2>第一次在现场见到 RIIZE</h2><span>21 JUN 2025 · SEOUL</span></div>
          <strong>4,667 <small>KM</small></strong>
          <p>travelled for this live memory</p>
        </div>
      </section>
    </>
  );
}
