import { useRef, useState } from 'react';
import { api, fmtDuration } from '../api';

const ACCEPTED = ['.mp3', '.flac', '.m4a', '.ogg', '.opus', '.wav'];
const isAudio = (file) => ACCEPTED.some((ext) => file.name.toLowerCase().endsWith(ext));

export default function Upload() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  // nested elements fire dragleave, so count enter/leave pairs
  const dragDepth = useRef(0);

  const accept = (list) => {
    const picked = [...list].filter(isAudio);
    const rejected = [...list].length - picked.length;
    setFiles(picked);
    setResults(null);
    setError(rejected ? `${rejected} file${rejected > 1 ? 's' : ''} skipped — not a supported audio format` : '');
  };

  const onDrop = (e) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    accept(e.dataTransfer.files);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!files.length) return;
    setBusy(true); setError(''); setResults(null);
    try {
      const res = await api.upload(files);
      setResults(res.results);
      setFiles([]);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <>
      <header className="stage-head">
        <div>
          <h1>Upload</h1>
          <p className="dim">
            Titles, artists, albums, years, artwork and durations are read from each
            file. Files without tags fall back to their filename.
          </p>
        </div>
      </header>

      <form onSubmit={submit}>
        <button
          type="button"
          className={`dropzone ${dragging ? 'dragging' : ''} ${files.length ? 'armed' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(e) => { e.preventDefault(); dragDepth.current += 1; setDragging(true); }}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
          onDragLeave={(e) => {
            e.preventDefault();
            dragDepth.current -= 1;
            if (dragDepth.current <= 0) { dragDepth.current = 0; setDragging(false); }
          }}
          onDrop={onDrop}
        >
          <div className="name">
            {dragging ? 'Drop to add them'
              : files.length ? `${files.length} file${files.length > 1 ? 's' : ''} ready`
              : 'Drag audio files here'}
          </div>
          <p className="dim small" style={{ margin: '6px 0 0' }}>
            {files.length
              ? files.slice(0, 3).map((f) => f.name).join(', ') + (files.length > 3 ? ` +${files.length - 3} more` : '')
              : 'or click to browse · MP3, FLAC, M4A, OGG, WAV · up to 20 at a time'}
          </p>
        </button>

        <input ref={inputRef} type="file" multiple hidden
               accept={ACCEPTED.join(',')}
               onChange={(e) => accept(e.target.files)} />

        {error && <div className="notice" style={{ marginTop: 14 }}>{error}</div>}

        <div className="controls" style={{ marginTop: 14 }}>
          <button className="btn btn-lamp" disabled={busy || !files.length}>
            {busy ? 'Reading tags…' : `Add ${files.length || ''} to library`.trim()}
          </button>
          {files.length > 0 && !busy && (
            <button type="button" className="btn-quiet"
                    onClick={() => { setFiles([]); setError(''); if (inputRef.current) inputRef.current.value = ''; }}>
              Clear
            </button>
          )}
        </div>
      </form>

      {results && (
        <div style={{ marginTop: 26 }}>
          <h2>Added</h2>
          <table className="tracks">
            <thead>
              <tr><th>File</th><th>Result</th><th>What we found</th></tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i}>
                  <td className="truncate">{r.file}</td>
                  <td><span className={`state ${r.status}`}>{r.status === 'ok' ? 'added' : r.status}</span></td>
                  <td className="dim">
                    {r.status === 'ok' && (
                      <>
                        {r.metadata.title} — {r.metadata.artist}
                        {r.metadata.album && ` · ${r.metadata.album}`}
                        {r.metadata.year && ` · ${r.metadata.year}`}
                        {` · ${fmtDuration(r.metadata.duration_sec)}`}
                        {r.metadata.cover && ' · artwork'}
                      </>
                    )}
                    {r.status === 'duplicate' && 'Already in your library'}
                    {r.status === 'error' && r.error}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
