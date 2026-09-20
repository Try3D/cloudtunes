import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api, fmtDuration } from '../api';
import Hero from '../components/Hero';
import SongTable from '../components/SongTable';
import { usePlayer } from '../PlayerContext';

export default function Library() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ songs: [], total: 0 });
  const [genres, setGenres] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { play } = usePlayer();

  const filters = Object.fromEntries(params);
  const collection = filters.album || filters.artist;   // an album or artist gets a hero
  const filtered = Boolean(filters.q || filters.genre || collection);

  useEffect(() => {
    setLoading(true);
    api.songs(filters).then(setData).finally(() => setLoading(false));
  }, [params.toString()]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api.genres().then((d) => setGenres(d.genres));
    api.playlists().then((d) => setPlaylists(d.playlists));
  }, []);

  const setFilter = (key, value) => {
    const next = { ...filters };
    if (value) next[key] = value; else delete next[key];
    setParams(next);
  };

  const remove = async (id) => {
    try {
      await api.deleteSong(id);
      setData((d) => ({ ...d, songs: d.songs.filter((s) => s.id !== id), total: d.total - 1 }));
    } catch (err) { setError(err.message); }
  };

  const list = (
    <SongTable
      songs={data.songs}
      playlists={playlists}
      onAdd={(playlistId, songId) => api.addToPlaylist(playlistId, songId)}
      onDelete={remove}
      emptyNote="Nothing matches that search."
    />
  );

  if (loading && !data.songs.length) return null;

  if (!data.songs.length && !filtered) {
    return (
      <div className="empty">
        <h2>Your library is empty</h2>
        <p className="dim">
          Add audio files and CloudTunes reads the title, artist, album, year and
          cover art out of each one.
        </p>
        <p style={{ marginTop: 20 }}><Link className="btn btn-lamp" to="/upload">Upload music</Link></p>
      </div>
    );
  }

  if (collection) {
    const total = data.songs.reduce((sum, s) => sum + (s.duration_sec || 0), 0);
    return (
      <div className="detail">
        <Hero
          art={data.songs[0]?.id}
          round={Boolean(filters.artist)}
          title={collection}
          lines={[
            filters.album ? `Album · ${data.songs[0]?.artist || ''}` : 'Artist',
            `${data.total} track${data.total === 1 ? '' : 's'}${total ? ` · ${fmtDuration(total)}` : ''}`,
          ]}
          onPlay={data.songs.length ? () => play(data.songs[0], data.songs) : null}
          actions={[{ label: 'Back to library', glyph: <ArrowLeft size={18} />, onClick: () => setParams({}) }]}
        />
        <div className="detail-list">{list}</div>
      </div>
    );
  }

  return (
    <>
      <div className="stage-head">
        <div>
          <h1>{filters.q ? `Results for “${filters.q}”` : 'Library'}</h1>
          <p className="dim small">
            {data.total} {data.total === 1 ? 'track' : 'tracks'}{filters.genre && ` in ${filters.genre}`}
          </p>
        </div>
        <div className="controls">
          <select value={filters.genre || ''} onChange={(e) => setFilter('genre', e.target.value)}>
            <option value="">Every genre</option>
            {genres.map((g) => <option key={g.genre} value={g.genre}>{g.genre} ({g.tracks})</option>)}
          </select>
          {filtered && <button className="btn-quiet" onClick={() => setParams({})}>Clear</button>}
          {data.songs.length > 0 && (
            <button className="btn btn-lamp" onClick={() => play(data.songs[0], data.songs)}>Play all</button>
          )}
        </div>
      </div>

      {error && <div className="notice" style={{ marginBottom: 14 }}>{error}</div>}
      {list}
    </>
  );
}
