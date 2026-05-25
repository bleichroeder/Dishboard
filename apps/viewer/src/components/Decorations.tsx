import { useEffect, useState, type CSSProperties } from 'react';
import type { ChefPopConfig, Decorations as DecorationsT, FoodDropConfig } from '@dishboard/shared';

export function Decorations({ decorations }: { decorations: DecorationsT | undefined }) {
  if (!decorations) return null;
  return (
    <>
      {decorations.chefPop?.enabled && decorations.chefPop.assetIds.length > 0 && (
        <ChefPop config={decorations.chefPop} />
      )}
      {decorations.foodDrop?.enabled && decorations.foodDrop.assetIds.length > 0 && (
        <FoodDrop config={decorations.foodDrop} />
      )}
    </>
  );
}

type Side = 'left' | 'right' | 'bottom';

function ChefPop({ config }: { config: ChefPopConfig }) {
  type Anim = { tick: number; side: Side; assetId: string; top: number; left: number };
  const [anim, setAnim] = useState<Anim | null>(null);
  // Re-key on assetIds/intervalSec changes so a config edit resets the cycle.
  const depKey = `${config.assetIds.join(',')}|${config.intervalSec}`;

  useEffect(() => {
    let counter = 0;
    function fire() {
      const sides: Side[] = ['left', 'right', 'bottom'];
      const side = sides[Math.floor(Math.random() * sides.length)]!;
      const assetId = config.assetIds[Math.floor(Math.random() * config.assetIds.length)]!;
      counter += 1;
      setAnim({
        tick: counter,
        side,
        assetId,
        top: 10 + Math.floor(Math.random() * 70),
        left: 10 + Math.floor(Math.random() * 70),
      });
    }
    const first = setTimeout(fire, 5000);
    const interval = setInterval(fire, config.intervalSec * 1000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [depKey]);

  if (!anim) return null;
  const wrapperStyle: CSSProperties =
    anim.side === 'bottom'
      ? ({ '--chef-left': `${anim.left}vw` } as CSSProperties)
      : ({ '--chef-top': `${anim.top}vh` } as CSSProperties);

  return (
    <div
      key={anim.tick}
      className={`chef-pop chef-pop--${anim.side}`}
      style={wrapperStyle}
      aria-hidden
    >
      <img
        src={`/media/${anim.assetId}`}
        alt=""
        className={`chef-pop__img chef-pop__img--${anim.side}`}
      />
    </div>
  );
}

function FoodDrop({ config }: { config: FoodDropConfig }) {
  type Anim = { tick: number; assetId: string; left: number };
  const [anim, setAnim] = useState<Anim | null>(null);
  const depKey = `${config.assetIds.join(',')}|${config.intervalSec}`;

  useEffect(() => {
    let counter = 0;
    function fire() {
      const assetId = config.assetIds[Math.floor(Math.random() * config.assetIds.length)]!;
      counter += 1;
      setAnim({
        tick: counter,
        assetId,
        left: 5 + Math.random() * 90,
      });
    }
    const first = setTimeout(fire, 3000);
    const interval = setInterval(fire, config.intervalSec * 1000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [depKey]);

  if (!anim) return null;
  return (
    <div key={anim.tick} className="food-drop" style={{ left: `${anim.left}vw` }} aria-hidden>
      <img src={`/media/${anim.assetId}`} alt="" />
    </div>
  );
}
