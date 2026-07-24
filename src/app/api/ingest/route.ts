import { NextRequest, NextResponse } from "next/server";
import { ServerValue } from "firebase-admin/database";
import { getAdminDatabase, isAdminConfigured } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

interface IncomingSlot {
  occupied: boolean;
  distanceCm?: number;
}

interface IncomingBody {
  slots?: Record<string, IncomingSlot>;
  gate?: "OPEN" | "CLOSED";
}

interface StoredEvent {
  type: "gate_open" | "gate_close" | "slot_occupied" | "slot_free";
  slotIndex?: number;
  distanceCm?: number;
}

// Simple reachability check — visiting the URL in a browser should not
// 404/405, so deployment issues are easy to tell apart from auth issues.
export async function GET() {
  return NextResponse.json({ ok: true, adminConfigured: isAdminConfigured() });
}

export async function POST(req: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Server is missing Firebase admin configuration." },
      { status: 503 }
    );
  }

  const expectedKey = process.env.INGEST_API_KEY;
  const providedKey = req.headers.get("x-api-key");
  if (!expectedKey || providedKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: IncomingBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.slots && !body.gate) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const db = getAdminDatabase();

  let previous: IncomingBody = {};
  try {
    const snapshot = await db.ref("parkingLot").get();
    previous = (snapshot.val() ?? {}) as IncomingBody;
  } catch (err) {
    console.error("Failed to read previous parkingLot state:", err);
    return NextResponse.json({ error: "Database read failed" }, { status: 502 });
  }

  const updates: Record<string, unknown> = {};
  const events: StoredEvent[] = [];

  if (body.slots) {
    for (const [index, slot] of Object.entries(body.slots)) {
      if (typeof slot?.occupied !== "boolean") continue;
      const prevSlot = previous.slots?.[index];
      if (!prevSlot || prevSlot.occupied !== slot.occupied) {
        events.push({
          type: slot.occupied ? "slot_occupied" : "slot_free",
          slotIndex: Number(index),
          distanceCm: slot.distanceCm,
        });
      }
      updates[`parkingLot/slots/${index}`] = slot;
    }
  }

  if (body.gate && (body.gate === "OPEN" || body.gate === "CLOSED")) {
    if (body.gate !== previous.gate) {
      events.push({ type: body.gate === "OPEN" ? "gate_open" : "gate_close" });
    }
    updates["parkingLot/gate"] = body.gate;
  }

  updates["parkingLot/updatedAt"] = ServerValue.TIMESTAMP;

  for (const event of events) {
    const key = db.ref("events").push().key;
    updates[`events/${key}`] = { ...event, timestamp: ServerValue.TIMESTAMP };
  }

  try {
    // A single multi-path update() call is atomic across all the paths
    // touched above — the state write and every history event land
    // together, or not at all.
    await db.ref().update(updates);
  } catch (err) {
    console.error("Failed to write parkingLot update:", err);
    return NextResponse.json({ error: "Database write failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, eventsLogged: events.length });
}
