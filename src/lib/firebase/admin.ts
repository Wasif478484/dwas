// Server-side Firebase Admin SDK (API routes + scripts/seed.ts).
import { cert, getApps, initializeApp } from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function init(): void {
  if (getApps().length > 0) return;
  const creds = process.env.FIREBASE_ADMIN_CREDENTIALS;
  if (creds) {
    initializeApp({
      credential: cert(JSON.parse(Buffer.from(creds, "base64").toString("utf8"))),
    });
  } else if (process.env.FIRESTORE_EMULATOR_HOST) {
    // Firestore emulator: FIRESTORE_EMULATOR_HOST is honoured by the Admin
    // SDK; it still wants a project id when there are no credentials.
    initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? "dwas" });
  } else {
    initializeApp();
  }
}
init();

export const db = getFirestore();
export const auth = getAuth();
