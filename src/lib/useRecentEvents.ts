"use client";

import { useEffect, useState } from "react";
import { limitToLast, onValue, query, ref } from "firebase/database";
import { getParkingDatabase, isFirebaseConfigured } from "@/lib/firebase";
import type { ActivityEvent } from "@/lib/types";

export interface TimelineEntry extends ActivityEvent {
  id: string;
}

export function useRecentEvents(count: number = 8): TimelineEntry[] {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    const eventsQuery = query(
      ref(getParkingDatabase(), "events"),
      limitToLast(count)
    );

    const unsubscribe = onValue(eventsQuery, (snapshot) => {
      const next: TimelineEntry[] = [];
      snapshot.forEach((child) => {
        next.push({ id: child.key ?? "", ...(child.val() as ActivityEvent) });
      });
      // RTDB returns ascending by key (== ascending by time); show newest first.
      setEntries(next.reverse());
    });

    return () => unsubscribe();
  }, [count]);

  return entries;
}
