# SmartPark Web

Live dashboard for the SmartPark ESP32 parking lot. Reads live bay status
and a history feed from Firebase Realtime Database; the Android companion
app is what writes to that database (see "How data gets here" below).

## Architecture

```
ESP32 (2x HC-SR04, servo gate)
   │  Bluetooth (existing protocol)
   ▼
Android app  ──HTTPS, x-api-key──▶  /api/ingest (this project, on Vercel)
                                          │  Firebase Admin SDK
                                          ▼
                                  Firebase Realtime Database
                                          │  onValue() — public read
                                          ▼
                                  This website (live dashboard)
```

The Admin SDK credential (service account) only ever lives on the server
(`/api/ingest`). Nobody else — not the ESP32, not the Android app's APK,
not the browser — ever holds write access. The database's security rules
(`firebase-rules.json`) reject every write that doesn't come through
that route.

## 1. Firebase setup

You already have a service account key (Admin SDK). Two more things are
needed from the Firebase console for **console.firebase.google.com** →
your project:

1. **Realtime Database rules** — Build → Realtime Database → Rules tab →
   paste the contents of `firebase-rules.json` → Publish.
2. **Web app config** (separate from the service account — this one is
   safe to expose to the browser) — Project settings (gear icon) →
   General tab → scroll to "Your apps" → if there's no web app yet,
   click **Add app → Web (`</>`)** (no hosting needed) → copy the
   `firebaseConfig` values shown.
3. Note your **exact** Realtime Database URL, shown at the top of the
   Realtime Database data viewer — it depends on which region you picked
   and won't always be the `firebaseio.com` default.

## 2. Environment variables

Copy `.env.local.example` to `.env.local` for local dev. There are two
groups:

- `NEXT_PUBLIC_FIREBASE_*` — the web app config from step 1.2 above.
  Safe to expose; the browser needs these to open a read connection.
- `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`
  / `FIREBASE_DATABASE_URL` — from the service account JSON. **Never**
  prefix these with `NEXT_PUBLIC_`. Keep the private key's `\n` sequences
  literal (don't turn them into real line breaks) — the code un-escapes
  them at runtime.
- `INGEST_API_KEY` — a password you make up (e.g. `openssl rand -hex 24`).
  The Android app must send the exact same value.

## 3. Local development

```bash
npm install
npm run dev
```

## 4. Deploy to Vercel

1. Push this project to a GitHub repo (a subfolder of your existing
   `SmartPark-ESP32-IoT-Parking-Lot-System-with-Bluetooth-App` repo is
   fine — set Vercel's "Root Directory" to that subfolder).
2. [vercel.com](https://vercel.com) → **Add New → Project** → import the
   repo.
3. Before the first deploy, open **Environment Variables** and add every
   variable listed above (all of them — public and server-side).
4. Deploy. Your dashboard is live at the assigned `*.vercel.app` URL, and
   `https://<your-app>.vercel.app/api/ingest` is the endpoint the Android
   app posts to (a GET request to that URL should return
   `{"ok":true,"adminConfigured":true}` once env vars are set).

## Data model

`/parkingLot` (current snapshot, overwritten on every update):

```json
{
  "slots": {
    "0": { "occupied": true, "distanceCm": 8 },
    "1": { "occupied": false, "distanceCm": 142 }
  },
  "gate": "OPEN",
  "updatedAt": 1737200000000
}
```

`/events/<push-id>` (append-only history, one entry per state change):

```json
{ "type": "slot_occupied", "slotIndex": 0, "distanceCm": 8, "timestamp": 1737200000000 }
```

`type` is one of `gate_open`, `gate_close`, `slot_occupied`, `slot_free`.
Slot index `0` is the sensor at the top row's 3rd bay; index `1` is the
sensor at the bottom row's 2nd bay (see `SENSOR_FLAT_INDICES` in
`src/components/ParkingLayout.tsx`).

### POST /api/ingest

```
POST /api/ingest
x-api-key: <INGEST_API_KEY>
Content-Type: application/json

{
  "slots": { "0": { "occupied": true, "distanceCm": 8 } },
  "gate": "OPEN"
}
```

You can send just `slots`, just `gate`, or both — whatever changed. The
route diffs against the last stored state and only logs an event for
fields that actually changed, then stamps `updatedAt`/`timestamp` with
Firebase's server clock (so the ESP32/phone's own clock accuracy doesn't
matter).
