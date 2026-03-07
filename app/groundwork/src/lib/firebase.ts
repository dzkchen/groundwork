import { initializeApp, getApps, App } from "firebase-admin/app";
import { cert } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let _app: App | undefined;
let _db: Firestore | undefined;

function getFirebaseCredential() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin env. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in app/groundwork/.env.local (or symlink from repo root .env.local)."
    );
  }

  return cert({
    projectId,
    clientEmail,
    privateKey,
  });
}

function getApp(): App {
  if (!_app) {
    _app = getApps().length
      ? getApps()[0]
      : initializeApp({
          credential: getFirebaseCredential(),
        });
  }
  return _app;
}

export function getDb(): Firestore {
  if (!_db) _db = getFirestore(getApp());
  return _db;
}
