import { useEffect, useRef, useState } from 'react';

/**
 * Search-as-you-type. The box keeps its own text; the trimmed value is committed
 * (URL, query state…) after the person stops typing for `delay` ms, so the API is
 * not called on every keystroke. `flush` commits at once (Enter key).
 * If the committed value changes from outside (back button, "clear filters"),
 * the box follows it.
 */
export function useLiveSearch(committed: string | undefined, onCommit: (value: string | undefined) => void, delay = 300) {
  const [text, setText] = useState(committed ?? '');
  const onCommitRef = useRef(onCommit);

  useEffect(() => {
    onCommitRef.current = onCommit;
  });

  useEffect(() => {
    setText((current) => (current.trim() === (committed ?? '') ? current : (committed ?? '')));
  }, [committed]);

  const value = text.trim() || undefined;

  useEffect(() => {
    if (value === committed) {
      return;
    }
    const timer = setTimeout(() => onCommitRef.current(value), delay);

    return () => clearTimeout(timer);
  }, [value, committed, delay]);

  return {
    text,
    setText,
    flush: () => value !== committed && onCommitRef.current(value),
    /** True while typed text has not been committed yet. */
    pending: value !== committed,
  };
}

/** A value that only updates after it has stopped changing for `delay` ms. */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
