import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Dialog from '../components/Dialog';

export default function Playlists() {
  const [playlists, setPlaylists] = useState(null);
  const [name, setName] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = () => api.playlists().then((d) => setPlaylists(d.playlists));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.createPlaylist(name.trim());
    setName('');
    load();
  };

  if (!playlists) return null;

  return (
    <>
      <header className="stage-head">
        <div>
          <h1>Playlists</h1>
          <p className="dim small">{playlists.length} saved</p>
        </div>
        <form className="controls" onSubmit={create}>
          <input type="text" placeholder="Name a new playlist" value={name}
                 onChange={(e) => setName(e.target.value)} />
          <button className="btn btn-lamp">Create</button>
        </form>
      </header>

      {playlists.length === 0 ? (
        <div className="empty">
          <h2>No playlists yet</h2>
          <p className="dim">
            Name one above, then add tracks to it from the library.
          </p>
        </div>
      ) : (
        <ul className="stack">
          {playlists.map((p) => (
            <li key={p.id}>
              <Link className="name truncate" to={`/playlists/${p.id}`}>{p.name}</Link>
              <span className="dim small num">{p.tracks} tracks</span>
              <button className="btn-quiet danger small" onClick={() => setPendingDelete(p)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={Boolean(pendingDelete)}
        title={`Delete “${pendingDelete?.name}”?`}
        message="The playlist goes away. The tracks stay in your library."
        confirmLabel="Delete playlist"
        danger
        onConfirm={async () => { await api.deletePlaylist(pendingDelete.id); setPendingDelete(null); load(); }}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
