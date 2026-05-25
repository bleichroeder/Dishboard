import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Menu } from '@dishboard/shared';
import { api } from '../api.js';
import { PreviewModal } from '../components/PreviewModal.js';
import { EditCanvas } from '../edit/EditCanvas.js';
import { EditorProvider, useEditor } from '../edit/EditorContext.js';
import { SidePanel } from '../edit/SidePanel.js';
import './../edit/menu-render.css';

export function MenuEditorPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setMenu(null);
    setError(null);
    api.menus
      .get(slug)
      .then((m) => {
        if (alive) setMenu(m);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  if (error && !menu) {
    return (
      <div className="page">
        <div className="banner banner--error">{error}</div>
        <Link to="/" className="btn btn--ghost">
          ← Back to menus
        </Link>
      </div>
    );
  }
  if (!menu) {
    return (
      <div className="page">
        <div className="muted">Loading…</div>
      </div>
    );
  }

  return <Editor initialMenu={menu} key={menu.id} />;
}

function Editor({ initialMenu }: { initialMenu: Menu }) {
  const [savedMenu, setSavedMenu] = useState<Menu>(initialMenu);
  const dirtyRef = useRef<Menu>(initialMenu);
  const [dirty, setDirty] = useState(false);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback((next: Menu) => {
    dirtyRef.current = next;
    setDirty(true);
    setSavingState('idle');
  }, []);

  return (
    <EditorProvider initialMenu={initialMenu} onChange={handleChange}>
      <EditorShell
        savedMenu={savedMenu}
        setSavedMenu={setSavedMenu}
        dirty={dirty}
        setDirty={setDirty}
        savingState={savingState}
        setSavingState={setSavingState}
        error={error}
        setError={setError}
        dirtyRef={dirtyRef}
      />
    </EditorProvider>
  );
}

function EditorShell({
  savedMenu,
  setSavedMenu,
  dirty,
  setDirty,
  savingState,
  setSavingState,
  error,
  setError,
  dirtyRef,
}: {
  savedMenu: Menu;
  setSavedMenu: (m: Menu) => void;
  dirty: boolean;
  setDirty: (d: boolean) => void;
  savingState: 'idle' | 'saving' | 'saved';
  setSavingState: (s: 'idle' | 'saving' | 'saved') => void;
  error: string | null;
  setError: (e: string | null) => void;
  dirtyRef: React.MutableRefObject<Menu>;
}) {
  const { menu, update } = useEditor();
  const navigate = useNavigate();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  async function onSave() {
    setSavingState('saving');
    setError(null);
    try {
      const toSave = dirtyRef.current;
      const saved = await api.menus.update(toSave.slug, toSave);
      setSavedMenu(saved);
      setDirty(false);
      setSavingState('saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setSavingState('idle');
    }
  }

  // Keyboard shortcut: Cmd/Ctrl+S to save
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (dirty && savingState !== 'saving') void onSave();
      }
      if (e.key === 'Escape') {
        // deselect handled by canvas click; this is a safety net for popovers
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, savingState]);

  // Avoid unused-var warnings for savedMenu while still re-rendering on save.
  void savedMenu;

  return (
    <div className={`edit-shell${panelOpen ? '' : ' edit-shell--panel-collapsed'}`}>
      <header className="edit-toolbar">
        <button
          type="button"
          className="link-button"
          onClick={() => navigate('/')}
          title="Back to menus"
        >
          ← Menus
        </button>
        <input
          className="edit-toolbar__title"
          value={menu.title}
          onChange={(e) =>
            update((d) => {
              d.title = e.target.value;
            })
          }
          aria-label="Menu title"
        />
        {error && <div className="edit-toolbar__error">{error}</div>}
        <div className="edit-toolbar__actions">
          {savingState === 'saved' && !dirty && <span className="saved-pill">Saved</span>}
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setPreviewOpen(true)}
            title={dirty ? 'Preview shows the last saved version' : 'Open viewer'}
          >
            Preview
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={onSave}
            disabled={!dirty || savingState === 'saving'}
          >
            {savingState === 'saving' ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            className="edit-toolbar__panel-toggle"
            onClick={() => setPanelOpen((v) => !v)}
            aria-label={panelOpen ? 'Collapse side panel' : 'Expand side panel'}
            title={panelOpen ? 'Hide panel' : 'Show panel'}
          >
            {panelOpen ? '⟩' : '⟨'}
          </button>
        </div>
      </header>

      <div className="edit-body">
        <EditCanvas />
        {panelOpen && <SidePanel />}
      </div>

      {previewOpen && <PreviewModal slug={menu.slug} onClose={() => setPreviewOpen(false)} />}
    </div>
  );
}
