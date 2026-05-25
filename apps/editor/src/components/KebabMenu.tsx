import { useEffect, useRef, useState } from 'react';

export type KebabAction = {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
};

export function KebabMenu({ actions, ariaLabel }: { actions: KebabAction[]; ariaLabel?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="kebab" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="kebab__trigger"
        aria-label={ariaLabel ?? 'More actions'}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden focusable="false">
          <circle cx="8" cy="3" r="1.5" fill="currentColor" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
          <circle cx="8" cy="13" r="1.5" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <ul className="kebab__menu" role="menu">
          {actions.map((a) => (
            <li key={a.label}>
              <button
                type="button"
                role="menuitem"
                className={`kebab__item${a.destructive ? ' kebab__item--destructive' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  a.onSelect();
                }}
              >
                {a.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
