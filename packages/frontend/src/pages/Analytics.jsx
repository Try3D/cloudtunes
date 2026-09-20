import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { BarList, HourChart, TrendChart } from '../components/Charts';

const mb = (bytes) => `${(Number(bytes) / 1024 ** 2).toFixed(1)} MB`;
const hrs = (sec) => `${(Number(sec) / 3600).toFixed(1)} h`;

export default function Analytics() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [exported, setExported] = useState('');

  useEffect(() => { api.analytics().then(setD); }, []);
  if (!d) return null;

  const doExport = async () => {
    setExported('Exporting…');
    const r = await api.export();
    setExported(`${r.rows} plays written to ${r.key}`);
  };

  if (!Number(d.totals.songs)) {
    return (
      <div className="empty">
        <h2>Nothing to measure yet</h2>
        <p className="dim">
          Listening stats start building as soon as your library has tracks and you
          play them.
        </p>
        <p style={{ marginTop: 18 }}><Link className="btn btn-lamp" to="/upload">Upload music</Link></p>
      </div>
    );
  }

  return (
    <>
      <header className="stage-head">
        <div>
          <h1>Listening</h1>
          <p className="dim small">Aggregated from every play recorded in the database</p>
        </div>
        {user.isAdmin && (
          <div className="controls">
            {exported && <span className="dim small">{exported}</span>}
            <button className="btn" onClick={doExport}>Export play log</button>
          </div>
        )}
      </header>

      <div className="readouts">
        {[['Tracks', d.totals.songs], ['Plays', d.totals.plays], ['Listeners', d.totals.users],
          ['Library', hrs(d.totals.library_seconds)], ['Stored', mb(d.totals.storage_bytes)]]
          .map(([label, value]) => (
            <div className="readout" key={label}>
              <div className="readout-value num">{value}</div>
              <div className="readout-label">{label}</div>
            </div>
          ))}
      </div>

      <section className="panel">
        <h2>Plays per day, last 30 days</h2>
        <TrendChart rows={d.daily} />
      </section>

      <section className="panel">
        <h2>When listening happens</h2>
        <HourChart rows={d.byHour} />
      </section>

      <div className="split">
        <section className="panel">
          <h2>Most played tracks</h2>
          <BarList rows={d.topSongs} labelKey="title" subKey="artist" valueKey="plays" />
        </section>
        <section className="panel">
          <h2>Most played artists</h2>
          <BarList rows={d.topArtists} labelKey="artist" valueKey="plays" />
        </section>
        <section className="panel">
          <h2>Genres</h2>
          <BarList rows={d.byGenre} labelKey="genre" valueKey="plays" />
        </section>
        <section className="panel">
          <h2>Listeners</h2>
          <table className="tracks">
            <thead>
              <tr><th>Account</th><th className="right">Plays</th><th className="right">Minutes</th></tr>
            </thead>
            <tbody>
              {d.topUsers.map((u) => (
                <tr key={u.username}>
                  <td>{u.username}</td>
                  <td className="right num">{u.plays}</td>
                  <td className="right num dim">{u.minutes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
