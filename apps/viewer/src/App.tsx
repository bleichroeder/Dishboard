import { useEffect, useState } from 'react';

type MenuListItem = {
  id: string;
  slug: string;
  title: string;
  updatedAt: number;
};

export function App() {
  const [menus, setMenus] = useState<MenuListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/menus')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ menus: MenuListItem[] }>;
      })
      .then((d) => setMenus(d.menus))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <main>
      <h1>Dishboard Viewer</h1>
      <p>Phase 1 placeholder — slot/template rendering lands in Phase 2.</p>
      {error && <pre style={{ color: 'crimson' }}>error: {error}</pre>}
      {menus && menus.length === 0 && (
        <p>
          No menus yet. From <code>apps/server</code>, run <code>npm run migrate:legacy</code> to
          import from the legacy Dishboard.
        </p>
      )}
      {menus && menus.length > 0 && (
        <ul>
          {menus.map((m) => (
            <li key={m.id}>
              <strong>{m.title}</strong> — <code>/{m.slug}</code>
              <small style={{ marginLeft: '0.75rem', opacity: 0.7 }}>
                updated {new Date(m.updatedAt * 1000).toLocaleString()}
              </small>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
