import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export function EntrySide() {
  return (
    <div className="entry-side">
      <div className="wordmark">CloudTunes</div>
      <h1>Your records,<br />wherever you are.</h1>
      <p>
        A private music library that reads the tags off your own files and streams
        them back to you.
      </p>
      <ul className="entry-facts">
        <li>Titles, artwork and years read straight from each upload</li>
        <li>Playlists, search and album views</li>
        <li>Listening stats built from every play</li>
      </ul>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await login(form.username, form.password); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="entry">
      <EntrySide />
      <div className="entry-form">
        <form onSubmit={submit}>
          <h2>Sign in</h2>
          {error && <div className="notice">{error}</div>}
          <input type="text" placeholder="Username or email" autoComplete="username" required
                 value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <input type="password" placeholder="Password" autoComplete="current-password" required
                 value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button className="btn btn-lamp" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <p>New here? <Link to="/signup">Create an account</Link></p>
        </form>
      </div>
    </div>
  );
}
