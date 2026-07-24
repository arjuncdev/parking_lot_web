import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

// Deliberately NOT prefixed with NEXT_PUBLIC_. These are only ever read
// on the server (API routes), and must be set as regular (non-public)
// environment variables in the Vercel project dashboard — never in
// client code, never committed to git.
function readCredential() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) return null;

  // Unescape literal \n sequences
  privateKey = privateKey.replace(/\\n/g, "\n");

  // Strip leading and trailing double or single quotes if present
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  } else if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
    privateKey = privateKey.slice(1, -1);
  }

  privateKey = privateKey.trim();

  return { projectId, clientEmail, privateKey };
}

export function isAdminConfigured(): boolean {
  return Boolean(readCredential() && process.env.FIREBASE_DATABASE_URL);
}

let cachedApp: App | null = null;

function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  if (cachedApp) return cachedApp;

  const credentials = readCredential();
  if (!credentials || !process.env.FIREBASE_DATABASE_URL) {
    throw new Error(
      "Firebase admin env vars are missing. Set FIREBASE_PROJECT_ID, " +
        "FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY and FIREBASE_DATABASE_URL " +
        "in the Vercel project settings (see README)."
    );
  }

  cachedApp = initializeApp({
    credential: cert(credentials),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
  return cachedApp;
}

export function getAdminDatabase() {
  return getDatabase(getAdminApp());
}
