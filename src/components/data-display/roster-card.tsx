import type { TeamRosterEntry } from "@/lib/types";
import { CARD_INK, GOLD, lightFor, tierFor } from "@/lib/card-tier";

// A web take on the app's gold + electric collectible card (mobile CardTemplateV2), sized
// for a coach's roster grid.
//
// 🔴 NO PHOTO, BY DESIGN. Card photos are frames from the player's own videos and live only
// on their phone; most players are minors. The photo window shows a monogram instead.
//
// The card leads with the player's STRONGEST discipline, the same way a mobile roster tile
// leads with a card per mode: the tier and electric trim come from that best score, so the
// colour a coach sees matches the best card the player holds in the app.

const DISCIPLINES = [
  { key: "pmi", label: "PITCHER", short: "PMI" },
  { key: "hmi", label: "HITTER", short: "HMI" },
  { key: "cmi", label: "CATCHER", short: "CMI" },
] as const;

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

export function RosterCard({ player, teamName }: { player: TeamRosterEntry; teamName?: string | null }) {
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
    ...DISCIPLINES.map((d) => `${d.short} ${player[d.key] ?? "none"}`),
  ].join(", ");

  return (
    <article aria-label={summary} className="h-full">
      {/* Gold frame: the outer layer IS the gold, the inner layer is the card face. */}
      <div className="h-full p-[3px]" style={{ background: goldEdge, clipPath: chamfer }}>
        <div
          className="flex h-full flex-col items-center gap-3 px-4 pb-4 pt-3"
          style={{
            clipPath: chamfer,
            background: `radial-gradient(120% 70% at 50% 0%, ${electric}22 0%, transparent 60%), linear-gradient(180deg, ${CARD_INK.panel} 0%, ${CARD_INK.bg} 100%)`,
            color: CARD_INK.text,
          }}
        >
          {/* Name plate — the name once, at the top, as on the phone. */}
          <p
            className="w-full truncate text-center text-base font-extrabold uppercase tracking-wider"
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

          {/* Photo window → monogram in an electric ring. */}
          <div
            aria-hidden
            className="flex size-24 items-center justify-center rounded-full text-3xl font-black tracking-wide"
            style={{
              border: `2px solid ${electric}`,
              boxShadow: `0 0 14px ${glow}88, inset 0 0 18px ${electric}55`,
              background: `radial-gradient(circle at 50% 35%, #1A2A40 0%, ${CARD_INK.bg} 75%)`,
              color: CARD_INK.text,
              textShadow: `0 0 10px ${glow}`,
            }}
          >
            {initials(player.name)}
          </div>

          {/* Discipline + tier plate. */}
          <div className="flex w-full items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em]">
            <span style={{ color: CARD_INK.soft }}>{best ? best.label : "NO CARD YET"}</span>
            {best && (
              <span className="rounded-sm px-1.5 py-0.5" style={{ color: tier.ring, border: `1px solid ${tier.ring}99` }}>
                {tier.label}
              </span>
            )}
          </div>

          {/* PMI / HMI / CMI rings. */}
          <dl className="grid w-full grid-cols-3 gap-2" aria-hidden>
            {DISCIPLINES.map((d) => {
              const v = player[d.key];
              const lit = best?.key === d.key;
              return (
                <div key={d.key} className="flex flex-col items-center gap-1">
                  <dd
                    className="flex size-11 items-center justify-center rounded-full text-sm font-extrabold tabular-nums"
                    style={{
                      border: `2px solid ${v == null ? "#2A3646" : lit ? electric : GOLD.mid}`,
                      boxShadow: lit ? `0 0 10px ${glow}77` : undefined,
                      color: v == null ? CARD_INK.dim : CARD_INK.text,
                    }}
                  >
                    {v ?? "—"}
                  </dd>
                  <dt className="text-[10px] font-bold tracking-widest" style={{ color: CARD_INK.dim }}>{d.short}</dt>
                </div>
              );
            })}
          </dl>

          {teamName && (
            <p className="mt-auto w-full truncate text-center text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: CARD_INK.dim }}>
              {teamName}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
