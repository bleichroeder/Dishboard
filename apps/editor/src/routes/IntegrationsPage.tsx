import { useEffect, useState, type FormEvent } from 'react';
import type { IntegrationsStatus } from '@dishboard/shared';
import { api } from '../api.js';

type SyncReport = {
  startedAt: string;
  finishedAt: string;
  scannedRefs: number;
  uniqueLookups: number;
  menusUpdated: number;
  errors: string[];
};

export function IntegrationsPage() {
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [token, setToken] = useState('');
  const [environment, setEnvironment] = useState<'production' | 'sandbox'>('production');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastReport, setLastReport] = useState<SyncReport | null>(null);

  function refresh() {
    api.integrations
      .get()
      .then(setStatus)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(refresh, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const s = await api.integrations.saveSquare({ accessToken: token.trim(), environment });
      setStatus(s);
      setToken('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save token');
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Remove the Square access token? Sync will stop.')) return;
    setError(null);
    setBusy(true);
    try {
      setStatus(await api.integrations.removeSquare());
      setLastReport(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove');
    } finally {
      setBusy(false);
    }
  }

  async function onSyncNow() {
    setError(null);
    setBusy(true);
    setLastReport(null);
    try {
      const report = await api.square.syncNow();
      setLastReport(report);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Integrations</h1>
      </header>

      {error && <div className="banner banner--error">{error}</div>}

      <section className="card">
        <header className="card__head">
          <h2 className="card__title">Square</h2>
          {status?.square.configured && (
            <span className="pill pill--info">connected · {status.square.environment}</span>
          )}
        </header>
        <p className="muted">
          Link menu items to your Square catalog so prices and sold-out status sync automatically.
          Background sync runs every few minutes; use “Sync now” to force an immediate pass.
        </p>

        {status?.square.configured ? (
          <div className="form-actions">
            <button type="button" className="btn btn--primary" onClick={onSyncNow} disabled={busy}>
              {busy ? 'Working…' : 'Sync now'}
            </button>
            <button type="button" className="btn btn--danger" onClick={onRemove} disabled={busy}>
              Remove token
            </button>
          </div>
        ) : (
          <form onSubmit={onSave}>
            <label className="field">
              <span className="field__label">Access token</span>
              <input
                className="field__input"
                type="password"
                autoComplete="off"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="EAAA…"
                required
              />
              <span className="field__hint">
                Generate at Square Developer dashboard → Credentials → Production / Sandbox Access
                Token.
              </span>
            </label>
            <label className="field">
              <span className="field__label">Environment</span>
              <select
                className="field__input"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as 'production' | 'sandbox')}
              >
                <option value="production">Production</option>
                <option value="sandbox">Sandbox</option>
              </select>
            </label>
            <div className="form-actions">
              <button type="submit" className="btn btn--primary" disabled={busy || !token.trim()}>
                {busy ? 'Saving…' : 'Save token'}
              </button>
            </div>
          </form>
        )}

        {lastReport && (
          <div className="sync-report">
            <div>
              <strong>Sync complete.</strong>
            </div>
            <div className="muted">
              {lastReport.scannedRefs} linked references · {lastReport.uniqueLookups} unique Square
              lookups · {lastReport.menusUpdated} menu{lastReport.menusUpdated === 1 ? '' : 's'}{' '}
              updated · {lastReport.errors.length} errors
            </div>
            {lastReport.errors.length > 0 && (
              <ul className="sync-errors">
                {lastReport.errors.slice(0, 5).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
                {lastReport.errors.length > 5 && (
                  <li className="muted">… {lastReport.errors.length - 5} more</li>
                )}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
