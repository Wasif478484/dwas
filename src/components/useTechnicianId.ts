// Client-side technician identity and API headers. Kept out of lib/auth/demo.ts
// so that module stays importable from Server Component route handlers.
"use client";

import { useEffect, useState } from "react";

const DEMO_ID_KEY = "dwas-demo-technician-id";
const DEFAULT_TECHNICIAN_ID = "rafiq-ahmad";

function firebaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
}

export function readDemoTechnicianId(): string {
  if (typeof window === "undefined") return DEFAULT_TECHNICIAN_ID;
  return window.localStorage.getItem(DEMO_ID_KEY) || DEFAULT_TECHNICIAN_ID;
}

// Returns null until auth resolves (immediately in demo mode).
export function useTechnicianId(): string | null {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseConfigured()) {
      setId(readDemoTechnicianId());
      return;
    }
    let active = true;
    let unsub: (() => void) | undefined;
    void import("@/lib/firebase/client")
      .then(async ({ getFirebaseApp }) => {
        const { getAuth, onAuthStateChanged } = await import("firebase/auth");
        if (!active) return;
        unsub = onAuthStateChanged(getAuth(getFirebaseApp()), (user) => setId(user?.uid ?? null));
      })
      .catch(() => {
        if (active) setId(null);
      });
    return () => {
      active = false;
      unsub?.();
    };
  }, []);

  return id;
}

export async function technicianAuthHeaders(): Promise<Record<string, string>> {
  if (firebaseConfigured()) {
    const [{ getFirebaseApp }, { getAuth }] = await Promise.all([
      import("@/lib/firebase/client"),
      import("firebase/auth"),
    ]);
    const user = getAuth(getFirebaseApp()).currentUser;
    if (user) return { Authorization: `Bearer ${await user.getIdToken()}` };
    return {};
  }
  return { "x-demo-technician-id": readDemoTechnicianId() };
}
