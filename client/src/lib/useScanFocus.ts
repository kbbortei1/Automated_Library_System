import { useEffect, useRef } from 'react';

/**
 * Keeps a barcode scanner's target field focused.
 *
 * A handheld scanner is a keyboard: it types the barcode then sends Enter.
 * That only works if the right field already has focus, otherwise the first
 * scan of every transaction goes nowhere and staff have to reach for the
 * mouse between every book.
 *
 * `resetKey` re-focuses whenever it changes, which is how focus returns to
 * the field after a scan is processed and the form clears.
 */
export function useScanFocus<T extends HTMLElement>(active: boolean, resetKey?: unknown) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active) return;
    // A frame's delay lets the field finish enabling before focus moves,
    // since a disabled input cannot take focus.
    const id = requestAnimationFrame(() => ref.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [active, resetKey]);

  return ref;
}
