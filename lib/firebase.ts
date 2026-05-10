import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const rawConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

function isPlaceholder(value: string): boolean {
  const v = value.trim().toLowerCase();
  return (
    !v ||
    v === "your_api_key" ||
    v === "your_project.firebaseapp.com" ||
    v === "your_project_id" ||
    v === "your_project.appspot.com" ||
    v === "your_sender_id" ||
    v === "your_app_id" ||
    v.startsWith("your_")
  );
}

export const missingFirebaseEnv = Object.entries(rawConfig)
  .filter(([, value]) => isPlaceholder(value))
  .map(([key]) => key);

const firebaseConfig = {
  apiKey: rawConfig.apiKey || "missing-api-key",
  authDomain: rawConfig.authDomain || "missing-auth-domain",
  projectId: rawConfig.projectId || "missing-project-id",
  storageBucket: rawConfig.storageBucket || "missing-storage-bucket",
  messagingSenderId: rawConfig.messagingSenderId || "missing-sender-id",
  appId: rawConfig.appId || "missing-app-id",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = (() => {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    return getFirestore(app);
  }
})();
