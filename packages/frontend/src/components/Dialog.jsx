import { useEffect, useRef, useState } from 'react';

// native <dialog>: esc, focus trap and backdrop for free
export default function Dialog({
  open, title, message, field, defaultValue = '',
  confirmLabel = 'Save', danger, onConfirm, onCancel, children,
}) {
  const ref = useRef(null);
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      setValue(defaultValue);
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [open, defaultValue]);

  const submit = (e) => {
    e.preventDefault();
    if (field && !value.trim()) return;
    onConfirm(value.trim());
  };

  return (
    <dialog ref={ref} className="dialog" onCancel={(e) => { e.preventDefault(); onCancel(); }}>
      <form onSubmit={submit}>
        <h2>{title}</h2>
        {message && <p className="dim">{message}</p>}
        {field && (
          // eslint-disable-next-line jsx-a11y/no-autofocus
          <input type="text" autoFocus value={value} placeholder={field}
                 aria-label={field} maxLength={100}
                 onChange={(e) => setValue(e.target.value)} />
        )}
        {children}
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onCancel}>
            {children ? 'Close' : 'Cancel'}
          </button>
          {/* A dialog that only offers choices needs no confirm button. */}
          {!children && (
            <button type="submit" className={`btn ${danger ? 'btn-danger' : 'btn-lamp'}`}
                    disabled={field ? !value.trim() : false}>
              {confirmLabel}
            </button>
          )}
        </div>
      </form>
    </dialog>
  );
}
