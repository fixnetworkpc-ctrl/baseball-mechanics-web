import { notFound } from "next/navigation";
import { RosterCard } from "@/components/data-display/roster-card";
import type { TeamRosterEntry } from "@/lib/types";

// LOCAL-ONLY preview of the roster cards with made-up players, one per tier.
//
// Why it exists: the live server only accepts the deployed site's origin (WEB_APP_ORIGINS on
// Render), so `npm run dev` on localhost cannot load a real roster. This page needs no data.
// 🔴 It 404s in production — `next build`/Vercel sets NODE_ENV=production.

const SAMPLE: TeamRosterEntry[] = [
  { name: "Avery Mythic",     firstName: "Avery",  pmi: 96, hmi: 88, cmi: null },
  { name: "Blake Legendary",  firstName: "Blake",  pmi: null, hmi: 91, cmi: 72 },
  { name: "Casey Epic",       firstName: "Casey",  pmi: 70, hmi: 74, cmi: 86 },
  { name: "Drew Rare",        firstName: "Drew",   pmi: 81, hmi: null, cmi: null },
  { name: "Emerson Common",   firstName: "Emerson", pmi: 77, hmi: 62, cmi: 58 },
  { name: "Finley Prospect",  firstName: "Finley", pmi: 54, hmi: 61, cmi: null },
  { name: "Gray No-Scores",   firstName: "Gray",   pmi: null, hmi: null, cmi: null },
  { name: "Harper Christopher-Longname", firstName: "Harper", pmi: 83, hmi: 83, cmi: 79 },
];

export default function CardPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <h1 className="text-lg font-semibold">Roster card preview (local only)</h1>
      <p className="text-sm text-muted-foreground">Sample players, one per tier. This page 404s on the live site.</p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {SAMPLE.map((p) => (
          <li key={p.name}>
            <RosterCard player={p} teamName="Sample Team 12U" />
          </li>
        ))}
      </ul>
    </main>
  );
}
