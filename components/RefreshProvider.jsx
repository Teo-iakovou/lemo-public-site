"use client";

import { createContext, useCallback, useContext, useRef } from "react";

const RefreshContext = createContext(null);

export function useRefreshBus() {
  return useContext(RefreshContext);
}

/**
 * A tiny refresh bus. A booking/availability component (e.g. BookingModal) can
 * register an async refresh handler while it is open; the Header's refresh button
 * calls triggerRefresh() and awaits it so its spinner reflects the real work.
 * When no handler is registered, triggerRefresh() resolves to false and the
 * caller falls back to router.refresh().
 */
export default function RefreshProvider({ children }) {
  const handlerRef = useRef(null);

  const registerRefreshHandler = useCallback((fn) => {
    handlerRef.current = fn;
    // Return an unregister fn so the component can clean up on unmount/close.
    return () => {
      if (handlerRef.current === fn) handlerRef.current = null;
    };
  }, []);

  // Resolves true if a registered handler dealt with the refresh, false if the
  // caller should fall back (router.refresh). Never throws to the caller.
  const triggerRefresh = useCallback(async () => {
    const fn = handlerRef.current;
    if (typeof fn !== "function") return false;
    try {
      await fn();
    } catch {
      // Swallow — the handler owns its own error UI; the button just stops spinning.
    }
    return true;
  }, []);

  return (
    <RefreshContext.Provider value={{ registerRefreshHandler, triggerRefresh }}>
      {children}
    </RefreshContext.Provider>
  );
}
