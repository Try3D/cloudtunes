import { Music, Play } from 'lucide-react';
import { coverUrl } from '../api';

// header for playlists and single album/artist views
export default function Hero({ art, title, owner, lines = [], round, onPlay, actions = [] }) {
  return (
    <header className="hero">
      <div className={`hero-art ${round ? 'round' : ''}`}>
        {art ? (
          <img src={coverUrl(art)} alt=""
               onError={(e) => { e.target.style.visibility = 'hidden'; }} />
        ) : (
          <Music size={64} className="hero-art-empty" aria-hidden="true" />
        )}
      </div>

      <h1 className="hero-title">{title}</h1>

      {owner && (
        <div className="hero-owner">
          <span className="avatar sm">{owner.slice(0, 1).toUpperCase()}</span>
          <span>{owner}</span>
        </div>
      )}

      {lines.map((line, i) => <p key={i} className="hero-line">{line}</p>)}

      <div className="hero-actions">
        {actions.map((a) => (
          <button key={a.label} className="orb" title={a.label} aria-label={a.label} onClick={a.onClick}>
            {a.glyph}
          </button>
        ))}
        {onPlay && (
          <button className="orb orb-main" onClick={onPlay} aria-label="Play">
            <Play size={24} fill="currentColor" />
          </button>
        )}
      </div>
    </header>
  );
}
