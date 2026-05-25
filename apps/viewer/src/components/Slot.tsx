import { useEffect, useState } from 'react';
import type { Slot as SlotType } from '@dishboard/shared';
import { SectionVariantView } from './SectionVariantView.js';

export function Slot({ slot }: { slot: SlotType }) {
  const [variantIdx, setVariantIdx] = useState(0);

  useEffect(() => {
    setVariantIdx(0);
    if (!slot.rotation || slot.variants.length <= 1) return;
    const { intervalSec, cycle } = slot.rotation;
    const id = setInterval(() => {
      setVariantIdx((prev) => {
        if (cycle === 'random') {
          if (slot.variants.length <= 1) return 0;
          let next = Math.floor(Math.random() * slot.variants.length);
          if (next === prev) next = (next + 1) % slot.variants.length;
          return next;
        }
        return (prev + 1) % slot.variants.length;
      });
    }, intervalSec * 1000);
    return () => clearInterval(id);
  }, [slot]);

  const safeIdx = Math.min(variantIdx, slot.variants.length - 1);
  const variant = slot.variants[safeIdx]!;
  const rotating = slot.variants.length > 1 && !!slot.rotation;

  return <SectionVariantView variant={variant} rotating={rotating} />;
}
