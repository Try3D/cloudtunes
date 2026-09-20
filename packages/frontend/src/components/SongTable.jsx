import { useState } from 'react';
import { ListPlus, Play, Trash2 } from 'lucide-react';
import Dialog from './Dialog';
import { usePlayer } from '../PlayerContext';
import { useAuth } from '../AuthContext';
import { coverUrl, fmtDuration } from '../api';

export default function SongTable({ songs, playlists = [], onAdd, onRemove, onDelete, emptyNote }) {
  const { play, current } = usePlayer();
  const { user } = useAuth();
  const [pendingDelete, setPendingDelete] = useState(null);
  const [addingTo, setAddingTo] = useState(null);

  // drag carries the song id, rail playlists are the drop targets
  const startDrag = (e, song) => {
    e.dataTransfer.setData('application/x-cloudtunes-song', String(song.id));
    e.dataTransfer.setData('text/plain', `${song.title} — ${song.artist}`);
    e.dataTransfer.effectAllowed = 'copy';
  };

  if (!songs.length) return <p className="dim">{emptyNote || 'No tracks here yet.'}</p>;

  return (
    <div className="rows">
      {songs.map((s) => (
        <div key={s.id} className={`row ${current?.id === s.id ? 'playing' : ''}`}
             draggable onDragStart={(e) => startDrag(e, s)}>
          <button className="cue" onClick={() => play(s, songs)} aria-label={`Play ${s.title}`}>
            <img src={coverUrl(s.id)} alt=""
                 onError={(e) => { e.target.style.visibility = 'hidden'; }} />
            <span className="cue-veil"><Play size={16} fill="currentColor" /></span>
          </button>

          <div className="row-text">
            <div className="row-title truncate">{s.title}</div>
            <div className="row-sub truncate">
              {s.artist}
              {s.album && <span className="dot">{s.album}</span>}
              {!s.album && s.genre && <span className="dot">{s.genre}</span>}
            </div>
          </div>

          <span className="row-time num">{fmtDuration(s.duration_sec)}</span>

          <div className="row-actions">
            {onAdd && playlists.length > 0 && (
              <button className="btn-quiet" title="Add to playlist" aria-label="Add to playlist"
                      onClick={() => setAddingTo(s)}>
                <ListPlus size={16} />
              </button>
            )}
            {onRemove && (
              <button className="btn-quiet" onClick={() => onRemove(s.id)}>Remove</button>
            )}
            {onDelete && (user.isAdmin || s.uploaded_by === user.id) && (
              <button className="btn-quiet danger" title="Delete from library" aria-label="Delete from library"
                      onClick={() => setPendingDelete(s)}>
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      ))}

      <Dialog
        open={Boolean(addingTo)}
        title="Add to playlist"
        message={addingTo ? `${addingTo.title} — ${addingTo.artist}` : ''}
        onCancel={() => setAddingTo(null)}
      >
        <ul className="picker">
          {playlists.map((p) => (
            <li key={p.id}>
              <button type="button"
                      onClick={() => { onAdd(p.id, addingTo.id); setAddingTo(null); }}>
                <span className="truncate">{p.name}</span>
                <span className="dim small num">{p.tracks}</span>
              </button>
            </li>
          ))}
        </ul>
      </Dialog>

      <Dialog
        open={Boolean(pendingDelete)}
        title={`Delete “${pendingDelete?.title}”?`}
        message="The track and its artwork are removed from storage as well. This cannot be undone."
        confirmLabel="Delete track"
        danger
        onConfirm={() => { onDelete(pendingDelete.id); setPendingDelete(null); }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
