// Shape of the data the ESP32 pushes to Firebase Realtime Database at
// the "/parkingLot" path. Keep this in sync with esp32_parking_ai.ino.

export type GateState = "OPEN" | "CLOSED" | "UNKNOWN";

export interface SensorSlot {
  occupied: boolean;
  distanceCm: number;
}

export interface ParkingLotData {
  slots?: Record<string, SensorSlot>;
  gate?: GateState;
  updatedAt?: number;
}

// Connection status of this browser tab's link to Firebase — separate
// from whether the ESP32 itself is online (derived from updatedAt).
export type LinkStatus = "connecting" | "live" | "error";

export type ActivityEventType =
  | "gate_open"
  | "gate_close"
  | "slot_occupied"
  | "slot_free";

export interface ActivityEvent {
  type: ActivityEventType;
  slotIndex?: number;
  distanceCm?: number;
  timestamp?: number;
}
