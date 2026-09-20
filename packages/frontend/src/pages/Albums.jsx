import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, coverUrl } from '../api';

export default function Albums() {
  const [albums, setAlbums] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { api.albums().then((d) => setAlbums(d.albums)); }, []);

  if (!albums) return null;

  return (
    <>
      <header className="stage-head">
        <div>
          <h1>Albums</h1>
          <p className="dim small">{albums.length} grouped from your tags</p>
        </div>
      </header>

      {albums.length === 0 ? (
        <div className="empty">
          <h2>No albums yet</h2>
          <p className="dim">
            Albums appear once you upload files that carry an album tag.
          </p>
          <p style={{ marginTop: 18 }}><Link className="btn btn-lamp" to="/upload">Upload music</Link></p>
        </div>
      ) : (
        <div className="sleeves">
          {albums.map((a) => (
            <button key={`${a.artist}-${a.album}`} className="sleeve"
                    onClick={() => navigate(`/?album=${encodeURIComponent(a.album)}`)}>
              <div className="sleeve-art">
                <img src={coverUrl(a.cover_song_id)} alt=""
                     onError={(e) => { e.target.style.visibility = 'hidden'; }} />
              </div>
              <div className="sleeve-name truncate">{a.album}</div>
              <div className="sleeve-meta truncate">{a.artist}</div>
              <div className="sleeve-meta">{a.tracks} tracks{a.year ? ` · ${a.year}` : ''}</div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
