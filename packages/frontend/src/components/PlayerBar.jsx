import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Repeat, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { usePlayer } from '../PlayerContext';
import { coverUrl, streamUrl, fmtDuration } from '../api';

export default function PlayerBar() {
  const { audioRef, current, playing, setPlaying, toggle, skip, logPlay, index, queue } = usePlayer();
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [repeat, setRepeat] = useState(false);
  const loggedFor = useRef(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !current) return;
    el.src = streamUrl(current.id);
    el.load();
    if (playing) el.play().catch(() => setPlaying(false));
    setTime(0);
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPlaying = () => {
    setPlaying(true);
    if (loggedFor.current !== current.id) { loggedFor.current = current.id; logPlay(); }
  };

  const onEnded = () => {
    const el = audioRef.current;
    if (repeat && el) {
      // repeat replays the same track and counts as a new play
      loggedFor.current = null;
      el.currentTime = 0;
      el.play();
    } else {
      skip(1);
    }
  };

  const seek = (e) => {
    const el = audioRef.current;
    if (el && duration) { el.currentTime = Number(e.target.value); setTime(el.currentTime); }
  };

  const changeVolume = (e) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  return (
    <footer className="transport">
      {/* The progress line across the top of the bar is the scrubber itself. */}
      <input
        className="filament"
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={time}
        onChange={seek}
        disabled={!current}
        aria-label="Seek"
        style={{ '--pct': `${duration ? (time / duration) * 100 : 0}%` }}
      />

      <div className="keys">
        <button onClick={() => skip(-1)} disabled={!current || index <= 0} aria-label="Previous track">
          <SkipBack size={20} fill="currentColor" />
        </button>
        <button className="key-main" onClick={toggle} disabled={!current}
                aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
        </button>
        <button onClick={() => skip(1)} disabled={!current || index >= queue.length - 1}
                aria-label="Next track">
          <SkipForward size={20} fill="currentColor" />
        </button>
        <span className="clock num">{fmtDuration(time)} / {fmtDuration(duration)}</span>
      </div>

      {current ? (
        <div className="now">
          <img src={coverUrl(current.id)} alt=""
               onError={(e) => { e.target.style.visibility = 'hidden'; }} />
          <div className="truncate">
            <div className="now-title truncate">{current.title}</div>
            <div className="now-sub truncate">
              {current.artist}{current.album && <span className="dot">{current.album}</span>}
            </div>
          </div>
        </div>
      ) : (
        <div className="now dim small">Nothing playing — pick a track to start.</div>
      )}

      <div className="transport-end">
        <span className={`level ${playing ? 'on' : ''}`} aria-hidden="true"><i /><i /><i /><i /></span>
        <button className={repeat ? 'on' : ''} onClick={() => setRepeat((r) => !r)}
                aria-pressed={repeat} aria-label="Repeat this track">
          <Repeat size={18} />
        </button>
        <button onClick={() => changeVolume({ target: { value: volume > 0 ? 0 : 1 } })}
                aria-label={volume > 0 ? 'Mute' : 'Unmute'}>
          {volume > 0 ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
        <input type="range" min={0} max={1} step={0.01} value={volume}
               onChange={changeVolume} aria-label="Volume" />
        {queue.length > 0 && <span className="small num dim">{index + 1}/{queue.length}</span>}
      </div>

      <audio
        ref={audioRef}
        onPlaying={onPlaying}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.target.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.target.duration || current?.duration_sec || 0)}
        onEnded={onEnded}
      />
    </footer>
  );
}
