import { CARD_INK, GOLD, lightFor, tierFor } from "@/lib/card-tier";
import { HoloFigure, type Discipline } from "@/components/data-display/holo-figure";

// A web take on the app's gold + electric collectible card (mobile CardTemplateV2), sized
// for a roster grid.
//
// 🔴 NO PHOTO, BY DESIGN. Card photos are frames from the player's own videos and live only
// on their phone; most players are minors. The photo window shows the discipline hologram
// (the same figure the app's card uses) with the player's initials on a badge.
//
// The card leads with the player's STRONGEST discipline, the way a mobile roster tile leads
// with a card per mode: the figure, tier and electric trim all come from that best score,
// so the colour a coach sees matches the best card the player holds in the app.

export interface RosterCardPlayer {
  name: string;
  pmi: number | null;
  hmi: number | null;
  cmi: number | null;
}

const DISCIPLINES = [
  { key: "pmi", mode: "pitching", label: "PITCHER", short: "PMI" },
  { key: "hmi", mode: "batting", label: "HITTER", short: "HMI" },
  { key: "cmi", mode: "catching", label: "CATCHER", short: "CMI" },
] as const satisfies readonly { key: keyof RosterCardPlayer; mode: Discipline; label: string; short: string }[];

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

export function RosterCard({
  player,
  teamName,
  subline,
  jersey,
  selected = false,
  onSelect,
}: {
  player: RosterCardPlayer;
  teamName?: string | null;
  /** Small line under the tier plate, e.g. "SS". */
  subline?: string | null;
  /** Jersey number, shown under the initials. */
  jersey?: string | null;
  selected?: boolean;
  /** When given, the whole card is a button (opens the player's details). */
  onSelect?: () => void;
}) {
  const scored = DISCIPLINES
    .map((d) => ({ ...d, score: player[d.key] }))
    .filter((d): d is (typeof d & { score: number }) => d.score != null);
  const best = scored.reduce<(typeof scored)[number] | null>((a, b) => (!a || b.score > a.score ? b : a), null);
  const tier = tierFor(best?.score ?? null);
  const { electric, glow } = lightFor(tier);
  const goldEdge = `linear-gradient(160deg, ${GOLD.hi} 0%, ${GOLD.base} 30%, ${GOLD.lo} 52%, ${GOLD.base} 72%, ${GOLD.mid} 100%)`;
  const chamfer = "polygon(14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px), 0 14px)";

  const summary = [
    player.name,
    best ? `${best.label.toLowerCase()}, ${tier.label} tier` : "no scores yet",
    subline,
    jersey ? `number ${jersey}` : null,
    ...DISCIPLINES.map((d) => `${d.short} ${player[d.key] ?? "none"}`),
  ].filter(Boolean).join(", ");

  const face = (
    <div className="h-full p-[3px]" style={{ background: goldEdge, clipPath: chamfer }}>
      <div
        className="flex h-full flex-col items-center gap-2 px-3 pb-3 pt-3 sm:px-4"
        style={{
          clipPath: chamfer,
          background: `radial-gradient(120% 70% at 50% 0%, ${electric}22 0%, transparent 60%), linear-gradient(180deg, ${CARD_INK.panel} 0%, ${CARD_INK.bg} 100%)`,
          color: CARD_INK.text,
        }}
      >
        {/* Name plate — the name once, at the top, as on the phone. */}
        <p
          className="w-full truncate text-center text-sm font-extrabold uppercase tracking-wider sm:text-base"
          style={{
            backgroundImage: `linear-gradient(180deg, ${GOLD.hi} 0%, ${GOLD.base} 55%, ${GOLD.mid} 100%)`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
          title={player.name}
        >
          {player.name}
        </p>

        {/* Photo window → big gold initials (+ jersey #), the discipline hologram faded far
            back like the app's hologram layer. User found the full-strength figure crude at
            card size (2026-11-03). */}
        <div
          aria-hidden
          className="relative w-full overflow-hidden rounded-md"
          style={{
            aspectRatio: "4 / 4.4",
            border: `1px solid ${electric}88`,
            boxShadow: `inset 0 0 22px ${electric}40, 0 0 10px ${glow}33`,
            background: `radial-gradient(circle at 50% 40%, #13243A 0%, ${CARD_INK.bg} 78%)`,
          }}
        >
          <HoloFigure
            mode={best?.mode ?? "batting"}
            electric={electric}
            glow={glow}
            opacity={best ? 0.16 : 0.08}
            className="absolute inset-0 m-auto h-[92%] w-[92%]"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="font-black leading-none tracking-tight"
              style={{
                fontSize: "clamp(2.75rem, 9vw, 4.75rem)",
                backgroundImage: `linear-gradient(180deg, ${GOLD.hi} 0%, ${GOLD.base} 42%, ${GOLD.lo} 58%, ${GOLD.base} 78%, ${GOLD.mid} 100%)`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                filter: `drop-shadow(0 0 10px ${glow}55) drop-shadow(0 2px 0 #000A)`,
              }}
            >
              {initials(player.name)}
            </span>
            {jersey && (
              <span
                className="mt-1 text-lg font-extrabold tabular-nums tracking-wider sm:text-xl"
                style={{ color: electric, textShadow: `0 0 10px ${glow}` }}
              >
                #{jersey}
              </span>
            )}
          </div>
        </div>

        {/* Discipline + tier plate. */}
        <div className="flex w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[10px] font-bold uppercase tracking-[0.16em] sm:text-[11px]">
          <span style={{ color: CARD_INK.soft }}>{best ? best.label : "NO CARD YET"}</span>
          {best && (
            <span className="rounded-sm px-1.5 py-0.5" style={{ color: tier.ring, border: `1px solid ${tier.ring}99` }}>
              {tier.label}
            </span>
          )}
        </div>
        {subline && (
          <p className="-mt-1 w-full truncate text-center text-[10px] font-semibold tracking-widest" style={{ color: CARD_INK.dim }}>
            {subline}
          </p>
        )}

        {/* PMI / HMI / CMI rings. */}
        <div className="grid w-full grid-cols-3 gap-1.5" aria-hidden>
          {DISCIPLINES.map((d) => {
            const v = player[d.key];
            const lit = best?.key === d.key;
            return (
              <div key={d.key} className="flex flex-col items-center gap-1">
                <span
                  className="flex size-10 items-center justify-center rounded-full text-sm font-extrabold tabular-nums"
                  style={{
                    border: `2px solid ${v == null ? "#2A3646" : lit ? electric : GOLD.mid}`,
                    boxShadow: lit ? `0 0 10px ${glow}77` : undefined,
                    color: v == null ? CARD_INK.dim : CARD_INK.text,
                  }}
                >
                  {v ?? "—"}
                </span>
                <span className="text-[10px] font-bold tracking-widest" style={{ color: CARD_INK.dim }}>{d.short}</span>
              </div>
            );
          })}
        </div>

        {teamName && (
          <p className="mt-auto w-full truncate pt-1 text-center text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: CARD_INK.dim }}>
            {teamName}
          </p>
        )}
      </div>
    </div>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-label={summary}
        aria-pressed={selected}
        className="block h-full w-full rounded-sm text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        style={selected ? { filter: `drop-shadow(0 0 8px ${glow})` } : undefined}
      >
        {face}
      </button>
    );
  }
  return <article aria-label={summary} className="h-full">{face}</article>;
}
