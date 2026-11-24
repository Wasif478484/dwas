import { initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    if (!config.apiKey) {
      throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY is not set");
    }
    app = initializeApp(config);
  }
  return app;
}
