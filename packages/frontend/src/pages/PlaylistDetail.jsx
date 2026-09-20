import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import Dialog from '../components/Dialog';
import Hero from '../components/Hero';
import SongTable from '../components/SongTable';
import { usePlayer } from '../PlayerContext';

const longDuration = (sec) => {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h} hour${h > 1 ? 's' : ''}, ${m} minute${m === 1 ? '' : 's'}` : `${m} minute${m === 1 ? '' : 's'}`;
};

export default function PlaylistDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [dialog, setDialog] = useState(null);   // 'rename' | 'delete' | null
  const { play } = usePlayer();
  const { user } = useAuth();
  const navigate = useNavigate();

  const load = () => api.playlist(id).then(setData).catch(() => setData(false));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (data === false) {
    return (
      <div className="empty">
        <h2>Playlist not found</h2>
        <p className="dim">It may have been deleted. <Link to="/playlists">See all playlists</Link></p>
      </div>
    );
  }
  if (!data) return null;

  const total = data.songs.reduce((sum, s) => sum + (s.duration_sec || 0), 0);
  const year = new Date(data.playlist.created_at).getFullYear();

  return (
    <div className="detail">
      <Hero
        art={data.songs[0]?.id}
        title={data.playlist.name}
        owner={user.username}
        lines={[
          `Playlist · Private · ${year}`,
          `${data.songs.length} track${data.songs.length === 1 ? '' : 's'}${total ? ` · ${longDuration(total)}` : ''}`,
        ]}
        onPlay={data.songs.length ? () => play(data.songs[0], data.songs) : null}
        actions={[
          { label: 'Rename playlist', glyph: <Pencil size={18} />, onClick: () => setDialog('rename') },
          { label: 'Delete playlist', glyph: <Trash2 size={18} />, onClick: () => setDialog('delete') },
        ]}
      />

      <Dialog
        open={dialog === 'rename'}
        title="Rename playlist"
        field="Playlist name"
        defaultValue={data.playlist.name}
        confirmLabel="Rename"
        onConfirm={async (name) => { setDialog(null); await api.renamePlaylist(id, name); load(); }}
        onCancel={() => setDialog(null)}
      />

      <Dialog
        open={dialog === 'delete'}
        title={`Delete “${data.playlist.name}”?`}
        message="The playlist goes away. The tracks stay in your library."
        confirmLabel="Delete playlist"
        danger
        onConfirm={async () => { await api.deletePlaylist(id); navigate('/playlists'); }}
        onCancel={() => setDialog(null)}
      />

      <div className="detail-list">
        <SongTable
          songs={data.songs}
          onRemove={async (songId) => { await api.removeFromPlaylist(id, songId); load(); }}
          emptyNote="Nothing here yet. Add tracks from your library."
        />
      </div>
    </div>
  );
}
