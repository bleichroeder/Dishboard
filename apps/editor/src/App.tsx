import { useEffect, useState } from 'react';

type MenuListItem = {
  id: string;
  slug: string;
  title: string;
  updatedAt: number;
};

type AuthState = { authenticated: boolean; username: string | null };

export function App() {
  const [menus, setMenus] = useState<MenuListItem[] | null>(null);
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/menus').then((r) => r.json() as Promise<{ menus: MenuListItem[] }>),
      fetch('/api/auth/me').then((r) => r.json() as Promise<AuthState>),
    ])
      .then(([m, a]) => {
        setMenus(m.menus);
        setAuth(a);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <main>
      <h1>Dishboard Editor</h1>
      <p>Phase 1 placeholder — full CRUD UI lands in Phase 3.</p>
      <p>
        Auth:{' '}
        <strong>
          {auth ? (auth.authenticated ? `signed in as ${auth.username}` : 'not signed in') : '…'}
        </strong>
      </p>
      {error && <pre style={{ color: 'crimson' }}>error: {error}</pre>}
      {menus && (
        <>
          <h2>Menus ({menus.length})</h2>
          {menus.length === 0 ? (
            <p>No menus yet.</p>
          ) : (
            <ul>
              {menus.map((m) => (
                <li key={m.id}>
                  <strong>{m.title}</strong> — <code>/{m.slug}</code>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
