import { useEffect, useState } from 'react';
import type { SquareCatalogItem } from '@dishboard/shared';
import { api } from '../api.js';

export type SquarePick = { objectId: string; label: string; price: string | null };

export function SquarePicker({
  onPick,
  onClose,
}: {
  onPick: (pick: SquarePick) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SquareCatalogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setError(null);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      setLoading(true);
      setError(null);
      api.square
        .search(q)
        .then((items) => {
          if (!cancelled) setResults(items);
        })
        .catch((e: unknown) => {
          if (!cancelled) setError(e instanceof Error ? e.message : String(e));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <header className="modal__head">
          <h2 className="modal__title">Link Square item</h2>
          <button type="button" className="link-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        <div className="modal__body">
          <input
            className="field__input"
            autoFocus
            placeholder="Search Square catalog…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {error && <div className="banner banner--error">{error}</div>}
          {loading && <div className="muted">Searching…</div>}
          {!loading && !error && query.trim() && results.length === 0 && (
            <div className="muted">No matches.</div>
          )}
          <ul className="square-results">
            {results.map((item) => (
              <li key={item.itemId} className="square-result">
                <button
                  type="button"
                  className="square-result__item"
                  onClick={() =>
                    onPick({
                      objectId: item.itemId,
                      label: item.name,
                      price: item.variations[0]?.price ?? null,
                    })
                  }
                >
                  <strong>{item.name}</strong>
                  <span className="muted">link item</span>
                </button>
                {item.variations.length > 0 && (
                  <ul className="square-variations">
                    {item.variations.map((v) => (
                      <li key={v.variationId}>
                        <button
                          type="button"
                          className="square-result__variation"
                          onClick={() =>
                            onPick({
                              objectId: v.variationId,
                              label: `${item.name} — ${v.name || 'variation'}`,
                              price: v.price,
                            })
                          }
                        >
                          <span>{v.name || '(unnamed variation)'}</span>
                          <span className="muted">{v.price ?? ''}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
