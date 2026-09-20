import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, coverUrl } from '../api';

export default function Artists() {
  const [artists, setArtists] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { api.artists().then((d) => setArtists(d.artists)); }, []);

  if (!artists) return null;

  return (
    <>
      <header className="stage-head">
        <div>
          <h1>Artists</h1>
          <p className="dim small">{artists.length} in your library</p>
        </div>
      </header>

      {artists.length === 0 ? (
        <div className="empty">
          <h2>No artists yet</h2>
          <p className="dim">Upload a few tracks and they will be grouped by artist here.</p>
          <p style={{ marginTop: 18 }}><Link className="btn btn-lamp" to="/upload">Upload music</Link></p>
        </div>
      ) : (
        <div className="sleeves">
          {artists.map((a) => (
            <button key={a.artist} className="sleeve round"
                    onClick={() => navigate(`/?artist=${encodeURIComponent(a.artist)}`)}>
              <div className="sleeve-art">
                <img src={coverUrl(a.cover_song_id)} alt=""
                     onError={(e) => { e.target.style.visibility = 'hidden'; }} />
              </div>
              <div className="sleeve-name truncate">{a.artist}</div>
              <div className="sleeve-meta">
                {a.tracks} tracks{a.albums > 0 ? ` · ${a.albums} albums` : ''}
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
