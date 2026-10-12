"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type Updater<T> = T | ((prev: T) => T);

interface Codec<T> {
  parse: (raw: string) => T | undefined;
  serialize: (value: T) => string;
}

/**
 * UI state that lives in the URL query string (`?key=value`) instead of only in
 * component state, so a browser refresh (F5), a shared link, or navigating back
 * keeps the user exactly where they were (tab, page, filter, search, ...).
 *
 * - Values equal to the default are NOT written to the URL (clean URLs).
 * - Uses `history.replaceState` (integrated with the Next.js router), so it does
 *   not trigger a navigation / refetch and does not pollute browser history.
 * - A local mirror keeps the UI instant and typing smooth. It re-syncs from the
 *   URL when the URL is changed externally (e.g. clicking a sidebar link back to
 *   the page's default state).
 */
function useUrlValue<T>(
  key: string,
  defaultValue: T,
  codec: Codec<T>,
  isValid?: (value: T) => boolean
): [T, (next: Updater<T>) => void] {
  const searchParams = useSearchParams();

  const raw = searchParams.get(key);
  let urlValue = defaultValue;
  if (raw !== null) {
    const parsed = codec.parse(raw);
    if (parsed !== undefined && (!isValid || isValid(parsed))) urlValue = parsed;
  }

  const [value, setLocal] = useState<T>(urlValue);
  const valueRef = useRef<T>(value);
  const lastWriteAt = useRef(0);

  useEffect(() => {
    // Ignore the router catching up with our own (possibly stale) writes.
    if (Date.now() - lastWriteAt.current < 1000) return;
    valueRef.current = urlValue;
    setLocal(urlValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);

  const setValue = useCallback(
    (next: Updater<T>) => {
      const resolved =
        typeof next === "function" ? (next as (prev: T) => T)(valueRef.current) : next;
      valueRef.current = resolved;
      setLocal(resolved);

      lastWriteAt.current = Date.now();
      const params = new URLSearchParams(window.location.search);
      if (resolved === defaultValue) params.delete(key);
      else params.set(key, codec.serialize(resolved));
      const qs = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [defaultValue, key]
  );

  return [value, setValue];
}

const stringCodec: Codec<string> = { parse: (r) => r, serialize: (v) => v };
const numberCodec: Codec<number> = {
  parse: (r) => {
    const n = Number(r);
    return Number.isFinite(n) ? n : undefined;
  },
  serialize: (v) => String(v),
};

/** Tab (or any string/enum choice) stored in the URL. Defaults to `?tab=`. */
export function useUrlTab<T extends string>(
  defaultValue: T,
  options?: { key?: string; allowed?: readonly T[] }
): [T, (next: T) => void] {
  const allowed = options?.allowed as readonly string[] | undefined;
  return useUrlValue<T>(
    options?.key ?? "tab",
    defaultValue,
    stringCodec as unknown as Codec<T>,
    allowed ? (v) => allowed.includes(v) : undefined
  ) as [T, (next: T) => void];
}

/** Any string state (search text, filter, folder, ...) stored in the URL. */
export function useUrlString<T extends string = string>(
  key: string,
  defaultValue: T,
  allowed?: readonly T[]
): [T, (next: T | ((prev: T) => T)) => void] {
  const list = allowed as readonly string[] | undefined;
  return useUrlValue<T>(
    key,
    defaultValue,
    stringCodec as unknown as Codec<T>,
    list ? (v) => list.includes(v) : undefined
  );
}

/** Number state (page number, ...) stored in the URL. */
export function useUrlNumber(
  key: string,
  defaultValue: number
): [number, (next: number | ((prev: number) => number)) => void] {
  return useUrlValue<number>(key, defaultValue, numberCodec, (n) => n >= 0);
}

/**
 * Like `useEffect`, but skips the initial mount. Use it for "reset page to 1
 * when the filter changes" effects, so a page restored from the URL is not
 * immediately reset on load.
 */
export function useUpdateEffect(effect: () => void | (() => void), deps: unknown[]) {
  const prev = useRef(deps);
  useEffect(() => {
    if (prev.current.every((d, i) => Object.is(d, deps[i]))) return;
    prev.current = deps;
    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
