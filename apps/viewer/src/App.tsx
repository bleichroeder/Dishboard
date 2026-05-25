import { useState } from 'react';
import { MenuView } from './components/MenuView.js';
import { usePinnedMenu, useScheduledMenu } from './hooks.js';

type Route = { kind: 'schedule' } | { kind: 'pinned'; slug: string };

function parseRoute(pathname: string): Route {
  const m = /^\/m\/([a-z0-9-]+)\/?$/.exec(pathname);
  if (m) return { kind: 'pinned', slug: m[1]! };
  return { kind: 'schedule' };
}

export function App() {
  const [route] = useState<Route>(() => parseRoute(window.location.pathname));
  return route.kind === 'pinned' ? <PinnedView slug={route.slug} /> : <ScheduledView />;
}

function ScheduledView() {
  const { menu, info, error } = useScheduledMenu();

  if (error && !menu) {
    return (
      <main>
        <div className="viewer-error">
          <strong>Error:</strong> {error}
        </div>
      </main>
    );
  }
  if (!menu) {
    return (
      <main>
        <div className="viewer-loading">Loading current menu…</div>
      </main>
    );
  }
  return (
    <main>
      <MenuView menu={menu} />
      {info && <FooterStatus info={info} pinned={false} />}
    </main>
  );
}

function PinnedView({ slug }: { slug: string }) {
  const { menu, error } = usePinnedMenu(slug);
  if (error) {
    return (
      <main>
        <div className="viewer-error">
          <strong>Menu not found:</strong> <code>/{slug}</code>
          <div style={{ marginTop: '1rem' }}>
            <a href="/">View scheduled menu</a>
          </div>
        </div>
      </main>
    );
  }
  if (!menu) {
    return (
      <main>
        <div className="viewer-loading">Loading {slug}…</div>
      </main>
    );
  }
  return (
    <main>
      <MenuView menu={menu} />
      <FooterStatus pinned={true} slug={slug} />
    </main>
  );
}

function FooterStatus({
  info,
  pinned,
  slug,
}:
  | { info?: undefined; pinned: true; slug: string }
  | { info: import('./api.js').CurrentMenuInfo; pinned: false; slug?: undefined }) {
  return (
    <footer className="viewer-footer">
      {pinned ? (
        <span>
          Pinned to <code>/{slug}</code> · <a href="/">follow schedule</a>
        </span>
      ) : (
        <span>
          {info.day} {info.time}
          {info.nextChange
            ? ` · next change ${new Date(info.nextChange).toLocaleTimeString()}`
            : ''}
        </span>
      )}
    </footer>
  );
}
