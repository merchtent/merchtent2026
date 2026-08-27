"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

const STORAGE_PREFIX = "merch-tent:scroll:";

function storageKey(pathname: string, search: string) {
  return `${STORAGE_PREFIX}${pathname}${search ? `?${search}` : ""}`;
}

function saveScrollPosition(key: string) {
  try {
    sessionStorage.setItem(key, String(window.scrollY));
  } catch {
    // Ignore private browsing/session storage failures.
  }
}

function readScrollPosition(key: string) {
  try {
    const value = sessionStorage.getItem(key);
    return value ? Number(value) : null;
  } catch {
    return null;
  }
}

export default function ScrollRestoration() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const currentKeyRef = useRef<string | null>(null);
  const isHistoryNavigationRef = useRef(false);

  useEffect(() => {
    if (!("scrollRestoration" in window.history)) return;

    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    const markHistoryNavigation = () => {
      isHistoryNavigationRef.current = true;
    };

    window.addEventListener("popstate", markHistoryNavigation);

    return () => {
      window.removeEventListener("popstate", markHistoryNavigation);
    };
  }, []);

  useEffect(() => {
    const key = storageKey(pathname, search);
    currentKeyRef.current = key;

    if (isHistoryNavigationRef.current) {
      const savedY = readScrollPosition(key);
      if (typeof savedY === "number" && Number.isFinite(savedY)) {
        requestAnimationFrame(() => {
          window.scrollTo({ top: savedY, left: 0, behavior: "instant" });
        });
      }
      isHistoryNavigationRef.current = false;
    }

    let frame = 0;
    const saveCurrentScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        if (currentKeyRef.current) {
          saveScrollPosition(currentKeyRef.current);
        }
        frame = 0;
      });
    };

    window.addEventListener("scroll", saveCurrentScroll, { passive: true });
    window.addEventListener("pagehide", saveCurrentScroll);
    window.addEventListener("beforeunload", saveCurrentScroll);

    return () => {
      window.removeEventListener("scroll", saveCurrentScroll);
      window.removeEventListener("pagehide", saveCurrentScroll);
      window.removeEventListener("beforeunload", saveCurrentScroll);
      if (frame) cancelAnimationFrame(frame);
      saveScrollPosition(key);
    };
  }, [pathname, search]);

  return null;
}
