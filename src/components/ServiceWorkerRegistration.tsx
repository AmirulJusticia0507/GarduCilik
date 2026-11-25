"use client";

import { useEffect } from "react";

/**
 * Service worker hanya didaftarkan pada build produksi agar cache offline
 * tidak mengganggu hot reload saat pengembangan.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.error("Gagal mendaftarkan service worker GarduCilik.", error);
    });
  }, []);

  return null;
}
