"use client";

import { useId } from "react";
import { ELECTRIC } from "@/lib/card-tier";

// The glowing stick-figure "hologram" from the app's collectible card — web port of
// HoloFigure in baseball-mechanics-app/src/components/cards/precisionElementsV2.js.
// 🔴 Pose coordinates are copied 1:1 from POSES there; tune them there first, then copy.
//
// It stands in for the player photo, which never leaves the phone.

export type Discipline = "pitching" | "batting" | "catching";

type Pt = [number, number];
const POSES: Record<Discipline, { head: Pt; bones: [Pt, Pt][] }> = {
  // at contact, facing right
  batting: {
    head: [50, 26],
    bones: [
      [[52, 36], [57, 78]], [[47, 44], [67, 44]], [[47, 44], [64, 58]], [[64, 58], [86, 54]],
      [[67, 44], [79, 52]], [[79, 52], [86, 54]], [[86, 54], [116, 40]],
      [[51, 80], [63, 80]], [[51, 80], [42, 104]], [[42, 104], [36, 130]],
      [[63, 80], [78, 104]], [[78, 104], [90, 130]],
    ],
  },
  // stride landing, throwing arm up and back
  pitching: {
    head: [50, 24],
    bones: [
      [[52, 34], [55, 76]], [[45, 42], [61, 42]], [[45, 42], [34, 30]], [[34, 30], [30, 14]],
      [[61, 42], [74, 52]], [[74, 52], [82, 64]],
      [[50, 78], [61, 78]], [[50, 78], [42, 104]], [[42, 104], [26, 126]],
      [[61, 78], [78, 98]], [[78, 98], [94, 128]],
    ],
  },
  // receiving crouch, glove presented
  catching: {
    head: [60, 56],
    bones: [
      [[60, 66], [60, 98]], [[51, 72], [69, 72]], [[69, 72], [80, 82]], [[80, 82], [90, 76]],
      [[51, 72], [46, 88]], [[46, 88], [54, 98]],
      [[52, 100], [68, 100]], [[52, 100], [40, 110]], [[40, 110], [42, 132]],
      [[68, 100], [80, 110]], [[80, 110], [78, 132]],
    ],
  },
};

export function HoloFigure({
  mode = "batting",
  electric = ELECTRIC.ring,
  glow = ELECTRIC.glow,
  className,
  opacity = 1,
}: {
  mode?: Discipline;
  electric?: string;
  glow?: string;
  className?: string;
  opacity?: number;
}) {
  // Unique per instance: a roster renders many of these, and SVG gradient ids are global.
  const padId = `holo-pad-${useId().replace(/:/g, "")}`;
  const pose = POSES[mode] ?? POSES.batting;
  const joints = new Map<string, Pt>();
  pose.bones.forEach(([a, b]) => { joints.set(a.join(), a); joints.set(b.join(), b); });

  return (
    <svg viewBox="0 0 120 150" className={className} style={{ opacity }} aria-hidden focusable="false">
      <defs>
        <radialGradient id={padId} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={electric} stopOpacity={0.45} />
          <stop offset="1" stopColor={electric} stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={60} cy={136} rx={52} ry={11} fill={`url(#${padId})`} />
      <ellipse cx={60} cy={136} rx={44} ry={7.5} stroke={electric} strokeWidth={0.9} fill="none" opacity={0.7} />
      <ellipse cx={60} cy={136} rx={30} ry={5} stroke={glow} strokeWidth={0.7} fill="none" opacity={0.6} strokeDasharray="3 3" />
      {pose.bones.map(([a, b], i) => (
        <line key={`w${i}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={electric} strokeWidth={6} opacity={0.2} strokeLinecap="round" />
      ))}
      {pose.bones.map(([a, b], i) => (
        <line key={`c${i}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={glow} strokeWidth={2} strokeLinecap="round" />
      ))}
      <circle cx={pose.head[0]} cy={pose.head[1]} r={8} stroke={glow} strokeWidth={1.8} fill={electric} fillOpacity={0.2} />
      {[...joints.values()].map(([x, y]) => <circle key={`j${x}-${y}`} cx={x} cy={y} r={1.8} fill="#E4F4FF" />)}
    </svg>
  );
}
