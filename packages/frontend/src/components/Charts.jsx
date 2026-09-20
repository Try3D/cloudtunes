// single-series charts, the row label carries identity

export function BarList({ rows, labelKey, subKey, valueKey, unit = 'plays' }) {
  if (!rows.length) return <p className="dim small">No plays recorded yet.</p>;
  const max = Math.max(...rows.map((r) => Number(r[valueKey])), 1);
  return (
    <ul className="barlist">
      {rows.map((r, i) => (
        <li key={i}>
          <span className="truncate">
            {r[labelKey]}
            {subKey && r[subKey] && <span className="dim"> {r[subKey]}</span>}
          </span>
          <span className="meter" title={`${r[valueKey]} ${unit}`}>
            <span className="meter-fill" style={{ width: `${(Number(r[valueKey]) / max) * 100}%` }} />
          </span>
          <span className="num dim right">{r[valueKey]}</span>
        </li>
      ))}
    </ul>
  );
}

export function HourChart({ rows }) {
  const byHour = Array.from({ length: 24 }, (_, h) =>
    Number(rows.find((r) => r.hour === h)?.plays || 0));
  const max = Math.max(...byHour, 1);
  return (
    <div className="hours hours-scale">
      {byHour.map((plays, h) => (
        <div key={h} className="hour" title={`${String(h).padStart(2, '0')}:00 — ${plays} plays`}>
          <div className="hour-fill" style={{ height: `${(plays / max) * 100}%` }} />
          {h % 6 === 0 && <span className="hour-tick num">{String(h).padStart(2, '0')}</span>}
        </div>
      ))}
    </div>
  );
}

export function TrendChart({ rows }) {
  if (rows.length < 2) return <p className="dim small">Not enough listening history yet.</p>;
  const w = 720;
  const h = 150;
  const pad = 10;
  const values = rows.map((r) => Number(r.plays));
  const max = Math.max(...values, 1);
  const x = (i) => pad + (i * (w - pad * 2)) / (rows.length - 1);
  const y = (v) => h - pad - (v / max) * (h - pad * 2);
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(rows.length - 1).toFixed(1)},${h - pad} L${x(0).toFixed(1)},${h - pad} Z`;

  return (
    <svg className="trend" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img"
         aria-label={`Plays per day across the last ${rows.length} days`}>
      <path d={area} className="trend-area" />
      <path d={line} className="trend-line" />
      {rows.map((r, i) => (
        <circle key={i} cx={x(i)} cy={y(Number(r.plays))} r="7" className="trend-hit">
          <title>{`${new Date(r.day).toLocaleDateString()} — ${r.plays} plays`}</title>
        </circle>
      ))}
    </svg>
  );
}
