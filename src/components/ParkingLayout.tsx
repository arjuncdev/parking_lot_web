"use client";

import type { SensorSlot } from "@/lib/types";

interface BayDef {
  flatIndex: number;
  row: "top" | "bottom";
  col: number;
}

// 4 bays on the top row, 5 on the bottom — mirrors the physical lot
// diagram. Flat index 2 (top row, 3rd bay) and flat index 5 (bottom row,
// 2nd bay) are the two bays wired to an HC-SR04 sensor; every other bay
// is drawn for spatial accuracy but has no sensor, so it's shown as
// "not monitored" rather than guessed at.
const TOP_ROW: BayDef[] = [0, 1, 2, 3].map((col) => ({
  flatIndex: col,
  row: "top",
  col,
}));
const BOTTOM_ROW: BayDef[] = [0, 1, 2, 3, 4].map((col) => ({
  flatIndex: col + 4,
  row: "bottom",
  col,
}));
const BAYS = [...TOP_ROW, ...BOTTOM_ROW];

export const SENSOR_FLAT_INDICES = { sensor1: 2, sensor2: 5 } as const;

const TOP_Y = 34;
const TOP_H = 224;
const BOTTOM_Y = 372;
const BOTTOM_H = 224;
const LANE_X = 24;
const LANE_W = 140;

function bayRect(bay: BayDef) {
  if (bay.row === "top") {
    const rowX = LANE_X + LANE_W + 16;
    const rowW = 900 - rowX - 24;
    const bayW = rowW / 4;
    const gap = 6;
    return {
      x: rowX + bay.col * bayW + gap / 2,
      y: TOP_Y,
      w: bayW - gap,
      h: TOP_H,
    };
  }
  const rowX = 24;
  const rowW = 900 - rowX - 24;
  const bayW = rowW / 5;
  const gap = 6;
  return {
    x: rowX + bay.col * bayW + gap / 2,
    y: BOTTOM_Y,
    w: bayW - gap,
    h: BOTTOM_H,
  };
}

type BayVisualState = "free" | "occupied" | "unknown" | "unmonitored";

function stateForBay(
  flatIndex: number,
  sensor1?: SensorSlot,
  sensor2?: SensorSlot
): { state: BayVisualState; distanceCm?: number } {
  if (flatIndex === SENSOR_FLAT_INDICES.sensor1) {
    if (!sensor1) return { state: "unknown" };
    return {
      state: sensor1.occupied ? "occupied" : "free",
      distanceCm: sensor1.distanceCm,
    };
  }
  if (flatIndex === SENSOR_FLAT_INDICES.sensor2) {
    if (!sensor2) return { state: "unknown" };
    return {
      state: sensor2.occupied ? "occupied" : "free",
      distanceCm: sensor2.distanceCm,
    };
  }
  return { state: "unmonitored" };
}

const FILL: Record<BayVisualState, string> = {
  free: "var(--free-green-soft)",
  occupied: "var(--occupied-red-soft)",
  unknown: "var(--ink-850)",
  unmonitored: "var(--ink-850)",
};

const STROKE: Record<BayVisualState, string> = {
  free: "var(--free-green)",
  occupied: "var(--occupied-red)",
  unknown: "var(--ink-700)",
  unmonitored: "var(--ink-800)",
};

function SensorGlyph({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        x={-19}
        y={-13}
        width={38}
        height={26}
        rx={5}
        fill="var(--ink-950)"
        stroke="var(--ink-700)"
        strokeWidth={1.5}
      />
      <circle cx={-9} cy={0} r={6.5} fill="none" stroke="var(--paper-dim)" strokeWidth={1.5} />
      <circle cx={9} cy={0} r={6.5} fill="none" stroke="var(--paper-dim)" strokeWidth={1.5} />
    </g>
  );
}

export function ParkingLayout({
  sensor1,
  sensor2,
  live,
}: {
  sensor1?: SensorSlot;
  sensor2?: SensorSlot;
  live: boolean;
}) {
  return (
    <svg
      viewBox="0 0 900 620"
      className="w-full h-auto"
      role="img"
      aria-label="Live parking lot layout"
    >
      <rect x={0} y={0} width={900} height={620} rx={20} fill="var(--ink-900)" />

      {/* Entrance ramps — hazard-stripe surface, matches the physical
          lot's diagonal-hatched entry lanes */}
      <clipPath id="hatchTop">
        <rect x={LANE_X} y={TOP_Y} width={LANE_W} height={TOP_H} rx={10} />
      </clipPath>
      <clipPath id="hatchBottom">
        <rect x={LANE_X} y={BOTTOM_Y} width={LANE_W} height={BOTTOM_H} rx={10} />
      </clipPath>
      <g clipPath="url(#hatchTop)">
        <rect x={LANE_X} y={TOP_Y} width={LANE_W} height={TOP_H} fill="var(--ink-850)" />
        {Array.from({ length: 14 }).map((_, i) => (
          <line
            key={i}
            x1={LANE_X - 40 + i * 18}
            y1={TOP_Y + TOP_H}
            x2={LANE_X - 40 + i * 18 + TOP_H}
            y2={TOP_Y}
            stroke="var(--signal-yellow)"
            strokeWidth={5}
            opacity={0.55}
          />
        ))}
      </g>
      <g clipPath="url(#hatchBottom)">
        <rect x={LANE_X} y={BOTTOM_Y} width={LANE_W} height={BOTTOM_H} fill="var(--ink-850)" />
        {Array.from({ length: 14 }).map((_, i) => (
          <line
            key={i}
            x1={LANE_X - 40 + i * 18}
            y1={BOTTOM_Y + BOTTOM_H}
            x2={LANE_X - 40 + i * 18 + BOTTOM_H}
            y2={BOTTOM_Y}
            stroke="var(--signal-yellow)"
            strokeWidth={5}
            opacity={0.55}
          />
        ))}
      </g>
      <text
        x={LANE_X + LANE_W / 2}
        y={TOP_Y + TOP_H / 2 - 6}
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize={15}
        fontWeight={700}
        fill="var(--signal-yellow)"
        transform={`rotate(-90 ${LANE_X + LANE_W / 2} ${TOP_Y + TOP_H / 2})`}
      >
        ENTRY
      </text>
      <text
        x={LANE_X + LANE_W / 2}
        y={BOTTOM_Y + BOTTOM_H / 2 - 6}
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize={15}
        fontWeight={700}
        fill="var(--signal-yellow)"
        transform={`rotate(-90 ${LANE_X + LANE_W / 2} ${BOTTOM_Y + BOTTOM_H / 2})`}
      >
        ENTRY
      </text>

      {/* Driving lane connecting the two rows */}
      <rect
        x={LANE_X}
        y={TOP_Y + TOP_H}
        width={852}
        height={BOTTOM_Y - (TOP_Y + TOP_H)}
        fill="var(--ink-850)"
      />
      <line
        x1={LANE_X + 30}
        y1={(TOP_Y + TOP_H + BOTTOM_Y) / 2}
        x2={852}
        y2={(TOP_Y + TOP_H + BOTTOM_Y) / 2}
        stroke="var(--signal-yellow)"
        strokeWidth={3}
        strokeDasharray="20 16"
        opacity={0.5}
      />

      {/* Bays */}
      {BAYS.map((bay) => {
        const r = bayRect(bay);
        const { state, distanceCm } = stateForBay(bay.flatIndex, sensor1, sensor2);
        const isSensorBay = state !== "unmonitored";
        const cx = r.x + r.w / 2;

        return (
          <g key={bay.flatIndex}>
            <rect
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              rx={12}
              fill={FILL[state]}
              stroke={STROKE[state]}
              strokeWidth={state === "unmonitored" ? 1.5 : 2}
              strokeDasharray={state === "unmonitored" ? "6 6" : undefined}
            />
            {isSensorBay && live && state !== "unknown" && (
              <rect
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                rx={12}
                fill="none"
                stroke={STROKE[state]}
                strokeWidth={2}
                className="pulse-ring"
                style={{ transformOrigin: `${cx}px ${r.y + r.h / 2}px` }}
              />
            )}
            <text
              x={r.x + 14}
              y={r.y + 30}
              fontFamily="var(--font-display)"
              fontWeight={700}
              fontSize={26}
              fill={isSensorBay ? "var(--paper)" : "var(--paper-faint)"}
            >
              P
            </text>
            <text
              x={r.x + 14}
              y={r.y + r.h - 16}
              fontFamily="var(--font-body)"
              fontSize={12}
              fontWeight={500}
              fill={isSensorBay ? STROKE[state] : "var(--paper-faint)"}
            >
              {state === "free" && "Free"}
              {state === "occupied" && "Occupied"}
              {state === "unknown" && (live ? "Waiting…" : "Offline")}
              {state === "unmonitored" && "Not monitored"}
            </text>
            {isSensorBay && distanceCm !== undefined && (
              <text
                x={r.x + r.w - 12}
                y={r.y + r.h - 16}
                textAnchor="end"
                fontFamily="var(--font-mono)"
                fontSize={11}
                fill="var(--paper-dim)"
              >
                {distanceCm}cm
              </text>
            )}
            {isSensorBay && <SensorGlyph x={cx} y={r.y + r.h - 46} />}
          </g>
        );
      })}
    </svg>
  );
}
