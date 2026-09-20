import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { EntrySide } from './Login';

export default function Signup() {
  const { signup } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await signup(form.username, form.email, form.password); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="entry">
      <EntrySide />
      <div className="entry-form">
        <form onSubmit={submit}>
          <h2>Create an account</h2>
          {error && <div className="notice">{error}</div>}
          <input type="text" placeholder="Username" required value={form.username} onChange={set('username')} />
          <input type="email" placeholder="Email" required value={form.email} onChange={set('email')} />
          <input type="password" placeholder="Password, at least 8 characters" autoComplete="new-password"
                 required minLength={8} value={form.password} onChange={set('password')} />
          <button className="btn btn-lamp" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
          <p>Already have one? <Link to="/login">Sign in</Link></p>
        </form>
      </div>
    </div>
  );
}
