import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

/**
 * Render `children` at a fixed `DESIGN_WIDTH × DESIGN_HEIGHT` canvas and
 * apply a CSS scale transform so the canvas fits whatever container the
 * stage occupies. The kiosk TV renders at scale=1 (native crisp); a
 * smaller preview iframe or browser window scales down — text, gaps,
 * padding, everything shrinks together. This is what the legacy viewer
 * approximated with vw-based sizes, but a true transform makes the
 * scaling uniform.
 */
export function ScalableMenu({ children }: { children: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    function update() {
      if (!el) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w <= 0 || h <= 0) return;
      setScale(Math.min(w / DESIGN_WIDTH, h / DESIGN_HEIGHT));
    }

    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={stageRef} className="menu-stage">
      <div
        className="menu-canvas"
        style={{
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
