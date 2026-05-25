import { useEffect } from 'react';

export function PreviewModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const src = `${import.meta.env.VITE_VIEWER_URL ?? ''}/m/${slug}`;

  return (
    <div className="preview-modal-backdrop" onClick={onClose}>
      <div className="preview-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <header className="preview-modal__head">
          <span className="preview-modal__title">
            Preview <code>/{slug}</code>
          </span>
          <div className="preview-modal__actions">
            <a
              href={src}
              target="_blank"
              rel="noopener"
              className="link-button"
              title="Open in a new tab"
            >
              Open in new tab ↗
            </a>
            <button
              type="button"
              className="link-button"
              onClick={onClose}
              aria-label="Close"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </header>
        <iframe className="preview-modal__frame" src={src} title="Menu preview" />
      </div>
    </div>
  );
}
