"use client";

import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { getParkingDatabase, isFirebaseConfigured } from "@/lib/firebase";
import type { LinkStatus, ParkingLotData } from "@/lib/types";

interface UseParkingDataResult {
  data: ParkingLotData | null;
  status: LinkStatus;
  configured: boolean;
}

/**
 * Subscribes to /parkingLot in Realtime Database and keeps local state in
 * sync for as long as the component is mounted. Firebase's onValue keeps
 * an open connection and fires again on every future update, which is
 * what makes the dashboard live without any polling.
 */
export function useParkingData(): UseParkingDataResult {
  const configured = isFirebaseConfigured();
  const [data, setData] = useState<ParkingLotData | null>(null);
  const [liveStatus, setLiveStatus] = useState<LinkStatus>("connecting");

  useEffect(() => {
    // Nothing to subscribe to — `status` below already reflects this via
    // `configured`, so there's no state to set here.
    if (!configured) return;

    const lotRef = ref(getParkingDatabase(), "parkingLot");
    const unsubscribe = onValue(
      lotRef,
      (snapshot) => {
        setData(snapshot.val());
        setLiveStatus("live");
      },
      () => setLiveStatus("error")
    );

    return () => unsubscribe();
  }, [configured]);

  return { data, status: configured ? liveStatus : "error", configured };
}
