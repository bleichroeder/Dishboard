import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { produce, type Draft } from 'immer';
import type { Menu } from '@dishboard/shared';

export type Selection =
  | { kind: 'none' }
  | { kind: 'slot'; slotId: string }
  | { kind: 'item'; slotId: string; variantId: string; itemId: string };

export type PanelTab = 'template' | 'theme' | 'decorations' | 'slot';

export type EditorValue = {
  menu: Menu;
  update: (fn: (draft: Draft<Menu>) => void) => void;
  selection: Selection;
  select: (s: Selection) => void;
  activeTab: PanelTab;
  setActiveTab: (t: PanelTab) => void;
  activeVariantIdxBySlot: Record<string, number>;
  setActiveVariant: (slotId: string, idx: number) => void;
};

const Ctx = createContext<EditorValue | null>(null);

export function EditorProvider({
  initialMenu,
  onChange,
  children,
}: {
  initialMenu: Menu;
  onChange: (m: Menu) => void;
  children: ReactNode;
}) {
  const [menu, setMenu] = useState<Menu>(initialMenu);
  const [selection, setSelection] = useState<Selection>({ kind: 'none' });
  const [activeTab, setActiveTabInner] = useState<PanelTab>('template');
  const [activeVariantIdxBySlot, setActiveVariantMap] = useState<Record<string, number>>({});

  const update = useCallback(
    (fn: (draft: Draft<Menu>) => void) => {
      setMenu((cur) => {
        const next = produce(cur, fn);
        onChange(next);
        return next;
      });
    },
    [onChange],
  );

  const select = useCallback((s: Selection) => {
    setSelection(s);
    // Auto-switch to slot tab when a slot or item is selected.
    if (s.kind === 'slot' || s.kind === 'item') {
      setActiveTabInner('slot');
    }
  }, []);

  const setActiveTab = useCallback((t: PanelTab) => {
    setActiveTabInner(t);
  }, []);

  const setActiveVariant = useCallback((slotId: string, idx: number) => {
    setActiveVariantMap((cur) => ({ ...cur, [slotId]: idx }));
  }, []);

  const value: EditorValue = useMemo(
    () => ({
      menu,
      update,
      selection,
      select,
      activeTab,
      setActiveTab,
      activeVariantIdxBySlot,
      setActiveVariant,
    }),
    [
      menu,
      update,
      selection,
      select,
      activeTab,
      setActiveTab,
      activeVariantIdxBySlot,
      setActiveVariant,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEditor(): EditorValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useEditor must be inside EditorProvider');
  return v;
}
