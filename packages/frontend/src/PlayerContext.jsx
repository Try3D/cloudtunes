import { createContext, useContext, useRef, useState } from 'react';
import { api } from './api';

const PlayerContext = createContext(null);
export const usePlayer = () => useContext(PlayerContext);

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);

  const current = index >= 0 ? queue[index] : null;

  // playing a track loads its list as the queue
  const play = (song, list = [song]) => {
    const i = list.findIndex((s) => s.id === song.id);
    setQueue(list);
    setIndex(i < 0 ? 0 : i);
    setPlaying(true);
  };

  const toggle = () => {
    const el = audioRef.current;
    if (!el || !current) return;
    if (el.paused) { el.play(); setPlaying(true); } else { el.pause(); setPlaying(false); }
  };

  const skip = (delta) => {
    const next = index + delta;
    if (next >= 0 && next < queue.length) { setIndex(next); setPlaying(true); }
  };

  const value = { audioRef, queue, index, current, playing, setPlaying, play, toggle, skip,
    // counted once per track start, not per seek
    logPlay: () => current && api.logPlay(current.id).catch(() => {}) };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
