import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

const DESIGN_WIDTH = 1920;
const FIT_MARGIN = 0.96;

/**
 * Legacy Dishboard scaling technique: canvas has a fixed design WIDTH
 * (1920px) but content-driven HEIGHT, then a uniform scale transform
 * brings the whole canvas inside the stage. Dense menus render tall and
 * scale down; sparse menus stay big.
 *
 * The stage flex-centers the canvas; the canvas uses pure scale (no
 * translate-percent) since combining `translate(-50%, -50%)` with
 * `scale()` misaligns the result — the percentage translate is
 * calculated from the unscaled layout box and ends up offset.
 */
export function ScalableMenu({ children }: { children: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    function update() {
      if (!stage || !canvas) return;
      // offsetWidth/Height ignore transforms — give the natural layout size.
      const stageW = stage.clientWidth;
      const stageH = stage.clientHeight;
      const canvasW = canvas.offsetWidth;
      const canvasH = canvas.offsetHeight;
      if (canvasW <= 0 || canvasH <= 0 || stageW <= 0 || stageH <= 0) return;
      const next = Math.min(stageW / canvasW, stageH / canvasH) * FIT_MARGIN;
      setScale(next);
    }

    update();
    const obs = new ResizeObserver(update);
    obs.observe(stage);
    obs.observe(canvas);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={stageRef} className="menu-stage">
      <div
        ref={canvasRef}
        className="menu-canvas"
        style={{
          width: DESIGN_WIDTH,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
