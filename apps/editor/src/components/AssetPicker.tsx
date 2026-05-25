import { useEffect, useRef, useState } from 'react';
import type { AssetRecord } from '@dishboard/shared';
import { api } from '../api.js';

export function AssetPicker({
  onPick,
  onClose,
}: {
  onPick: (asset: AssetRecord) => void;
  onClose: () => void;
}) {
  const [assets, setAssets] = useState<AssetRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function refresh() {
    api.assets
      .list()
      .then(setAssets)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(refresh, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const asset = await api.assets.upload(file);
      setAssets((cur) => (cur ? [asset, ...cur] : [asset]));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function onDelete(asset: AssetRecord) {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete "${asset.filename}"? Menus using it will break.`)) return;
    try {
      await api.assets.remove(asset.id);
      setAssets((cur) => cur?.filter((a) => a.id !== asset.id) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <header className="modal__head">
          <h2 className="modal__title">Pick a background image</h2>
          <button type="button" className="link-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        <div className="modal__body">
          <div className="asset-picker__upload">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => fileInput.current?.click()}
              disabled={busy}
            >
              {busy ? 'Uploading…' : '+ Upload image'}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
              hidden
              onChange={onUpload}
            />
            <span className="field__hint">JPEG, PNG, GIF, WebP, or SVG. Max 10 MB.</span>
          </div>

          {error && <div className="banner banner--error">{error}</div>}

          {!assets && <div className="muted">Loading…</div>}
          {assets && assets.length === 0 && (
            <div className="muted">No images yet. Click “Upload image” to add one.</div>
          )}

          {assets && assets.length > 0 && (
            <ul className="asset-grid">
              {assets.map((a) => (
                <li key={a.id} className="asset-tile">
                  <button
                    type="button"
                    className="asset-tile__pick"
                    onClick={() => onPick(a)}
                    title="Pick this image"
                  >
                    <img src={`/media/${a.id}`} alt={a.filename} />
                  </button>
                  <div className="asset-tile__meta">
                    <span className="asset-tile__name" title={a.filename}>
                      {a.filename}
                    </span>
                    <button
                      type="button"
                      className="link-button asset-tile__delete"
                      onClick={() => onDelete(a)}
                      aria-label={`Delete ${a.filename}`}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
