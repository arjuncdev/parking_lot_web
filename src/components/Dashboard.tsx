"use client";

import { useEffect, useState } from "react";
import { useParkingData } from "@/lib/useParkingData";
import { useRecentEvents, type TimelineEntry } from "@/lib/useRecentEvents";
import { ParkingLayout, SENSOR_FLAT_INDICES } from "@/components/ParkingLayout";

function StatusPill({ status }: { status: "connecting" | "live" | "error" }) {
  const copy = {
    connecting: "Connecting…",
    live: "Live",
    error: "Not configured",
  }[status];
  const dotClass = {
    connecting: "bg-signal-yellow",
    live: "bg-free-green",
    error: "bg-occupied-red",
  }[status];

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-ink-800 bg-ink-900 px-3 py-1.5 text-sm text-paper-dim">
      <span className={`h-2 w-2 rounded-full ${dotClass} ${status === "live" ? "animate-pulse" : ""}`} />
      {copy}
    </span>
  );
}

function formatAgo(ms: number | undefined, now: number | null): string {
  if (!ms || !now) return "—";
  const diff = now - ms;
  if (diff < 0 || diff > 1000 * 60 * 60 * 24 * 30) return "—";
  if (diff < 5000) return "just now";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

function bayLabelFor(slotIndex: number | undefined): string {
  if (slotIndex === SENSOR_FLAT_INDICES.sensor1) return `Bay ${SENSOR_FLAT_INDICES.sensor1 + 1}`;
  if (slotIndex === SENSOR_FLAT_INDICES.sensor2) return `Bay ${SENSOR_FLAT_INDICES.sensor2 + 1}`;
  return `Slot ${slotIndex}`;
}

function describeEvent(entry: TimelineEntry): { label: string; dotClass: string } {
  switch (entry.type) {
    case "gate_open":
      return { label: "Entry gate opened", dotClass: "bg-free-green" };
    case "gate_close":
      return { label: "Entry gate closed", dotClass: "bg-occupied-red" };
    case "slot_occupied":
      return { label: `${bayLabelFor(entry.slotIndex)} became occupied`, dotClass: "bg-occupied-red" };
    case "slot_free":
      return { label: `${bayLabelFor(entry.slotIndex)} freed up`, dotClass: "bg-free-green" };
    default:
      return { label: "Update", dotClass: "bg-unmonitored" };
  }
}

export default function Dashboard() {
  const { data, status, configured } = useParkingData();
  const recentEvents = useRecentEvents(8);
  // `now` starts null (matches server render) and is only ever set from
  // an effect, so reading the clock never happens during render itself.
  const [now, setNow] = useState<number | null>(null);

  // Refresh every 15s so the "updated Xs ago" readout stays current
  // even when no new Firebase event has arrived.
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const initial = setTimeout(tick, 0);
    const id = setInterval(tick, 15000);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, []);

  const sensor1 = data?.slots?.["0"];
  const sensor2 = data?.slots?.["1"];
  const monitoredCount = [sensor1, sensor2].filter(Boolean).length;
  const freeCount = [sensor1, sensor2].filter((s) => s && !s.occupied).length;
  const gate = data?.gate ?? "UNKNOWN";
  const isStale =
    status === "live" && data?.updatedAt && now
      ? now - data.updatedAt > 1000 * 60 * 5
      : false;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-10">
        <div className="flex items-center gap-3">
          <div className="hazard-stripes h-9 w-9 rounded-md" aria-hidden />
          <div>
            <p
              className="text-2xl leading-none tracking-tight"
              style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
            >
              SMARTPARK
            </p>
            <p className="text-xs text-paper-faint mt-1">ESP32 IoT Parking Lot</p>
          </div>
        </div>
        <StatusPill status={isStale ? "error" : status} />
      </header>

      {!configured && (
        <div className="mb-8 rounded-xl border border-signal-yellow/40 bg-signal-yellow/10 px-5 py-4 text-sm text-paper">
          <strong className="text-signal-yellow">Firebase isn&apos;t configured yet.</strong>{" "}
          Add your project&apos;s credentials to <code className="text-paper-dim">.env.local</code> (see
          the README) and redeploy. The layout below is showing its empty state.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr] items-start">
        <div className="flex flex-col gap-6 order-2 lg:order-1">
          <div className="rounded-2xl border border-ink-800 bg-ink-900 p-6">
            <p className="text-sm text-paper-dim mb-1">Free right now</p>
            <p
              className="leading-none"
              style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "4.5rem" }}
            >
              {status === "live" ? freeCount : "?"}
              <span className="text-2xl text-paper-faint"> / {monitoredCount || 2}</span>
            </p>
            <p className="text-xs text-paper-faint mt-2">
              monitored bays free · 7 more bays shown for layout only
            </p>
          </div>

          <div className="rounded-2xl border border-ink-800 bg-ink-900 p-6">
            <p className="text-sm text-paper-dim mb-5">Entry gate</p>
            <div className="flex items-center gap-3">
              <div
                className={`h-3 w-16 rounded-full origin-left transition-transform ${
                  gate === "OPEN"
                    ? "bg-free-green -rotate-12"
                    : gate === "CLOSED"
                      ? "bg-occupied-red rotate-0"
                      : "bg-unmonitored rotate-0"
                }`}
              />
              <span
                className="text-lg"
                style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
              >
                {gate === "OPEN" ? "Open" : gate === "CLOSED" ? "Closed" : "Unknown"}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-ink-800 bg-ink-900 p-6 font-mono text-xs text-paper-dim space-y-2">
            <div className="flex justify-between">
              <span>sensor_1.distance</span>
              <span className="text-paper">{sensor1 ? `${sensor1.distanceCm}cm` : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span>sensor_2.distance</span>
              <span className="text-paper">{sensor2 ? `${sensor2.distanceCm}cm` : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span>last_sync</span>
              <span className="text-paper">{formatAgo(data?.updatedAt, now)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-800 bg-ink-900 p-4 sm:p-6 order-1 lg:order-2">
          <ParkingLayout sensor1={sensor1} sensor2={sensor2} live={status === "live" && !isStale} />
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 px-1 text-xs text-paper-dim">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-free-green" /> Free
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-occupied-red" /> Occupied
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-ink-700" /> Not
              monitored
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-ink-800 bg-ink-900 p-6">
        <p className="text-sm text-paper-dim mb-4">Recent activity</p>
        {recentEvents.length === 0 ? (
          <p className="text-sm text-paper-faint">
            No events logged yet — this fills in as the app reports changes.
          </p>
        ) : (
          <ul className="space-y-3">
            {recentEvents.map((entry) => {
              const { label, dotClass } = describeEvent(entry);
              return (
                <li key={entry.id} className="flex items-center gap-3 text-sm">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
                  <span className="text-paper flex-1">{label}</span>
                  <span className="font-mono text-xs text-paper-faint">
                    {formatAgo(entry.timestamp, now)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer className="mt-14 pt-6 border-t border-ink-800 text-xs text-paper-faint flex flex-wrap justify-between gap-3">
        <p>
          Two HC-SR04 ultrasonic sensors report bay {SENSOR_FLAT_INDICES.sensor1 + 1} and bay{" "}
          {SENSOR_FLAT_INDICES.sensor2 + 1} over Bluetooth to the companion Android app, which
          relays state and history to this dashboard over the internet.
        </p>
        <p>Built with Next.js · Hosted on Vercel</p>
      </footer>
    </div>
  );
}
