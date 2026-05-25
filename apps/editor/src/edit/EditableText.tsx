import { useEffect, useRef, type CSSProperties } from 'react';

/**
 * A minimal contenteditable wrapper. The DOM owns the editing buffer
 * while the user types; we sync to React state on blur (and Enter for
 * single-line). This avoids cursor-position jumping that comes from
 * controlling the value every keystroke.
 */
export function EditableText({
  value,
  onChange,
  placeholder,
  multiline = false,
  className,
  style,
  tag: Tag = 'span',
  ariaLabel,
  onSelect,
  onStopEditing,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  style?: CSSProperties;
  tag?: 'span' | 'div' | 'h1' | 'h2' | 'p';
  ariaLabel?: string;
  onSelect?: () => void;
  onStopEditing?: () => void;
}) {
  const ref = useRef<HTMLElement | null>(null);

  // Keep the DOM in sync when value changes from outside (e.g. live SSE
  // updates) without clobbering the cursor while the user is typing.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.textContent !== value) el.textContent = value;
  }, [value]);

  function flush() {
    const el = ref.current;
    if (!el) return;
    const next = (el.textContent ?? '').replace(/ /g, ' ');
    if (next !== value) onChange(next);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
  }

  const props = {
    ref: (el: HTMLElement | null) => {
      ref.current = el;
    },
    contentEditable: true,
    suppressContentEditableWarning: true,
    spellCheck: true,
    className,
    style,
    'aria-label': ariaLabel,
    'data-placeholder': placeholder,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect?.();
    },
    onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
    onKeyDown,
    onBlur: () => {
      flush();
      onStopEditing?.();
    },
  } as const;

  // Set initial textContent only on mount. The useEffect above handles
  // outside changes after that.
  function setRef(el: HTMLElement | null) {
    ref.current = el;
    if (el && el.textContent !== value) el.textContent = value;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Tag {...(props as any)} ref={setRef} />;
}
