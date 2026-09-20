import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  BarChart3, Disc3, ListMusic, Menu, Mic2, Plus, Search, Upload as UploadIcon,
} from 'lucide-react';
import { api } from './api';
import { useAuth } from './AuthContext';
import { PlayerProvider } from './PlayerContext';
import Dialog from './components/Dialog';
import PlayerBar from './components/PlayerBar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Library from './pages/Library';
import Albums from './pages/Albums';
import Artists from './pages/Artists';
import Upload from './pages/Upload';
import Playlists from './pages/Playlists';
import PlaylistDetail from './pages/PlaylistDetail';
import Analytics from './pages/Analytics';

function TopBar({ onToggleRail }) {
  const { user, logout } = useAuth();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();

  const search = (e) => {
    e.preventDefault();
    navigate(q.trim() ? `/?q=${encodeURIComponent(q.trim())}` : '/');
  };

  return (
    <div className="topbar">
      <div className="topbar-left">
        <button className="hamburger" onClick={onToggleRail} aria-label="Toggle menu">
          <Menu size={20} />
        </button>
        <NavLink to="/" className="wordmark">CloudTunes</NavLink>
      </div>

      <form className="omnibox" onSubmit={search} role="search">
        <Search size={18} aria-hidden="true" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)}
               placeholder="Search songs, albums, artists" aria-label="Search library" />
      </form>

      <div className="topbar-right">
        <button className="avatar" onClick={() => setMenu((m) => !m)} aria-label="Account">
          {user.username.slice(0, 1).toUpperCase()}
        </button>
        {menu && (
          <div className="menu" onMouseLeave={() => setMenu(false)}>
            <div className="menu-head">
              {user.username}{user.isAdmin && <span className="tag">admin</span>}
            </div>
            <button onClick={logout}>Sign out</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Rail() {
  const { pathname } = useLocation();
  const [playlists, setPlaylists] = useState([]);
  const [creating, setCreating] = useState(false);
  const [dropTarget, setDropTarget] = useState(null);
  const [flash, setFlash] = useState('');
  const navigate = useNavigate();

  const load = () => api.playlists().then((d) => setPlaylists(d.playlists)).catch(() => {});
  useEffect(() => { load(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const SONG = 'application/x-cloudtunes-song';
  const isSongDrag = (e) => e.dataTransfer.types.includes(SONG);

  const drop = async (e, playlist) => {
    if (!isSongDrag(e)) return;
    e.preventDefault();
    setDropTarget(null);
    const songId = e.dataTransfer.getData(SONG);
    await api.addToPlaylist(playlist.id, Number(songId));
    setFlash(`Added to ${playlist.name}`);
    setTimeout(() => setFlash(''), 2600);
    load();
  };

  const create = async (name) => {
    setCreating(false);
    const { playlist } = await api.createPlaylist(name);
    navigate(`/playlists/${playlist.id}`);
  };

  return (
    <aside className="rail">
      <nav>
        <NavLink to="/" end><ListMusic size={20} className="glyph" />Library</NavLink>
        <NavLink to="/albums"><Disc3 size={20} className="glyph" />Albums</NavLink>
        <NavLink to="/artists"><Mic2 size={20} className="glyph" />Artists</NavLink>
        <NavLink to="/upload"><UploadIcon size={20} className="glyph" />Upload</NavLink>
        <NavLink to="/analytics"><BarChart3 size={20} className="glyph" />Analytics</NavLink>
      </nav>

      <hr />

      <button className="pill" onClick={() => setCreating(true)}><Plus size={18} />New playlist</button>

      <Dialog
        open={creating}
        title="New playlist"
        field="Playlist name"
        confirmLabel="Create"
        onConfirm={create}
        onCancel={() => setCreating(false)}
      />

      <ul className="rail-list">
        {playlists.map((p) => (
          <li key={p.id}>
            <NavLink
              to={`/playlists/${p.id}`}
              className={dropTarget === p.id ? 'drop-on' : ''}
              onDragEnter={(e) => { if (isSongDrag(e)) setDropTarget(p.id); }}
              onDragOver={(e) => { if (isSongDrag(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } }}
              onDragLeave={() => setDropTarget((t) => (t === p.id ? null : t))}
              onDrop={(e) => drop(e, p)}
            >
              <span className="truncate">{p.name}</span>
              <span className="rail-sub">
                {dropTarget === p.id ? 'Drop to add' : `${p.tracks} tracks`}
              </span>
            </NavLink>
          </li>
        ))}
      </ul>

      {flash && <div className="flash" role="status">{flash}</div>}
    </aside>
  );
}

function Shell() {
  const [railOpen, setRailOpen] = useState(true);
  return (
    <PlayerProvider>
      <div className={`shell ${railOpen ? '' : 'rail-closed'}`}>
        <TopBar onToggleRail={() => setRailOpen((o) => !o)} />
        <Rail />
        <main className="stage">
          <div className="wash" aria-hidden="true" />
          <Routes>
            <Route path="/" element={<Library />} />
            <Route path="/albums" element={<Albums />} />
            <Route path="/artists" element={<Artists />} />
            <Route path="/playlists" element={<Playlists />} />
            <Route path="/playlists/:id" element={<PlaylistDetail />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <PlayerBar />
      </div>
    </PlayerProvider>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) {
    return (
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }
  return <Shell />;
}
