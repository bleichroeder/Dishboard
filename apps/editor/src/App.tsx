import { useEffect, useState } from 'react';

type Health = {
  status: string;
  sharedSchemaLoaded: boolean;
  timestamp: string;
};

export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/health')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Health>;
      })
      .then(setHealth)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <main>
      <h1>Dishboard Editor</h1>
      <p>Phase 0 placeholder — menu CRUD lands in Phase 3.</p>
      {error && <pre style={{ color: 'crimson' }}>error: {error}</pre>}
      {health && <pre>{JSON.stringify(health, null, 2)}</pre>}
    </main>
  );
}
