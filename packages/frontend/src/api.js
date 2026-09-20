// fetch wrapper, sends the session cookie and throws on errors
async function request(path, { method = 'GET', body, raw } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    ...(raw ? { body: raw } : {}),
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  me: () => request('/me'),
  login: (username, password) => request('/login', { method: 'POST', body: { username, password } }),
  signup: (username, email, password) =>
    request('/signup', { method: 'POST', body: { username, email, password } }),
  logout: () => request('/logout', { method: 'POST' }),

  songs: (params = {}) => request(`/songs?${new URLSearchParams(params)}`),
  song: (id) => request(`/songs/${id}`),
  deleteSong: (id) => request(`/songs/${id}`, { method: 'DELETE' }),
  albums: () => request('/albums'),
  artists: () => request('/artists'),
  genres: () => request('/genres'),

  logPlay: (id) => request(`/play/${id}`, { method: 'POST' }),
  upload: (files) => {
    const form = new FormData();
    for (const f of files) form.append('files', f);
    return request('/upload', { method: 'POST', raw: form });
  },

  playlists: () => request('/playlists'),
  createPlaylist: (name) => request('/playlists', { method: 'POST', body: { name } }),
  playlist: (id) => request(`/playlists/${id}`),
  renamePlaylist: (id, name) => request(`/playlists/${id}`, { method: 'PATCH', body: { name } }),
  deletePlaylist: (id) => request(`/playlists/${id}`, { method: 'DELETE' }),
  addToPlaylist: (id, songId) =>
    request(`/playlists/${id}/songs`, { method: 'POST', body: { song_id: songId } }),
  removeFromPlaylist: (id, songId) =>
    request(`/playlists/${id}/songs/${songId}`, { method: 'DELETE' }),

  analytics: () => request('/analytics'),
  export: () => request('/export', { method: 'POST' }),
  health: () => request('/health'),
};

export const streamUrl = (id) => `/api/stream/${id}`;
export const coverUrl = (id) => `/api/cover/${id}`;

export const fmtDuration = (s) =>
  s == null ? '--:--' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
