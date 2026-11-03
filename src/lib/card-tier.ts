// Collectible-card tiers for the web roster cards.
//
// 🔴 MIRROR, NOT A SOURCE. The thresholds and colours are copied from the mobile app:
//   baseball-mechanics-app/src/services/cardRarity.js   (RARITY_TIERS — the bands)
//   baseball-mechanics-app/src/services/tierVisuals.js  (ring / glow / level)
//   baseball-mechanics-app/src/components/cards/precisionElementsV2.js (GOLD, ELECTRIC, CARD_INK)
// The mobile bands are already shipped to players and must not move; if they ever do, change
// them there first and copy here. A coach seeing "Rare" on the web while the player's phone
// says "Epic" would be the one bug this file exists to prevent.

export type TierKey = "mythic" | "legendary" | "epic" | "rare" | "common" | "prospect";

export interface Tier {
  key: TierKey;
  label: string;
  ring: string;
  glow: string;
  level: number;
}

const TIERS: (Tier & { min: number })[] = [
  { key: "mythic",    label: "Mythic",    min: 95,        ring: "#B15CFF", glow: "#C77DFF", level: 5 },
  { key: "legendary", label: "Legendary", min: 90,        ring: "#F4C445", glow: "#FFD86B", level: 4 },
  { key: "epic",      label: "Epic",      min: 85,        ring: "#7C8CFF", glow: "#9AA6FF", level: 3 },
  { key: "rare",      label: "Rare",      min: 80,        ring: "#38B6FF", glow: "#5CC6FF", level: 2 },
  { key: "common",    label: "Common",    min: 75,        ring: "#B7C2CE", glow: "#9AA6B4", level: 1 },
  { key: "prospect",  label: "Prospect",  min: -Infinity, ring: "#C08A5E", glow: "#D9A87A", level: 0 },
];

// Null / non-finite scores fall to Prospect, exactly as on mobile.
export function tierFor(score: number | null | undefined): Tier {
  const n = Number(score);
  const t = score != null && Number.isFinite(n) ? TIERS.find((x) => n >= x.min)! : TIERS[TIERS.length - 1];
  return { key: t.key, label: t.label, ring: t.ring, glow: t.glow, level: t.level };
}

export const GOLD = { hi: "#FFF0BF", base: "#E6B652", mid: "#B8862E", lo: "#5E3D10" };
export const ELECTRIC = { ring: "#1F8FFF", glow: "#62D0FF" };
export const CARD_INK = { bg: "#07101C", panel: "#0A1422", text: "#EAF2FA", soft: "#C9D6E4", dim: "#8EA3B8" };

// Mobile's lightFor(): the electric trim is collection blue for Prospect/Common and takes
// the tier colour from Rare up.
export function lightFor(tier: Tier) {
  return tier.level >= 2
    ? { electric: tier.ring, glow: tier.glow }
    : { electric: ELECTRIC.ring, glow: ELECTRIC.glow };
}
