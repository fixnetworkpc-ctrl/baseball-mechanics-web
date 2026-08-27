"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getRecruiterProfile } from "@/lib/recruiter-service";
import { getMyPlayers, getMyTeam } from "@/lib/team-service";
import type { MyPlayer, MyTeamResponse, RecruiterProfile } from "@/lib/types";

/**
 * What this account actually HAS — the one place the portal decides what to show.
 *
 * 🔴 The portal shipped as a recruiter tool and kept that shape after it grew a coach
 * side and a player side. Every signed-in account saw the same twelve nav items, so a
 * parent who only wanted their kid's sessions was shown "AI Recruit", "Discover" and
 * "Organization" under a sidebar captioned "Recruiter Portal" — a portal that looks
 * like it is not for you.
 *
 * 🔑🔑 This keys on RELATIONSHIPS, never on a role. The mobile app deliberately
 * collapsed Player/Coach/Parent into one user, and re-introducing roles on web would
 * both undo that and mis-describe the modal user of this product: a parent who coaches
 * the team his own kid plays on. He is all three at once. "Do you own a team", "do you
 * have players", "do you have a recruiter profile" are independent and can all be true.
 */
export type ScopeStatus = "loading" | "ready" | "unknown";

export interface AccountScope {
  status: ScopeStatus;
  team: MyTeamResponse | null;
  players: MyPlayer[];
  recruiterProfile: RecruiterProfile | null;
  hasTeam: boolean;
  hasPlayers: boolean;
  hasRecruiterProfile: boolean;
}

const EMPTY: AccountScope = {
  status: "loading",
  team: null,
  players: [],
  recruiterProfile: null,
  hasTeam: false,
  hasPlayers: false,
  hasRecruiterProfile: false,
};

const Ctx = createContext<AccountScope>(EMPTY);

export const useAccountScope = () => useContext(Ctx);

export function AccountScopeProvider({ children }: { children: React.ReactNode }) {
  const [scope, setScope] = useState<AccountScope>(EMPTY);

  useEffect(() => {
    let active = true;
    (async () => {
      const [tm, plys, prof] = await Promise.allSettled([
        getMyTeam(),
        getMyPlayers(),
        getRecruiterProfile(),
      ]);
      if (!active) return;

      const team = tm.status === "fulfilled" ? tm.value : null;
      const players = plys.status === "fulfilled" ? plys.value : [];
      const recruiterProfile = prof.status === "fulfilled" ? prof.value : null;

      // 🔑🔑 FAIL OPEN, and note that this is the OPPOSITE of how the mobile app scopes
      // a team roster — deliberately. There, an unknown roster shows NOBODY, because
      // showing everybody was the bug. Here, an unknown answer shows EVERYTHING, because
      // the failure being guarded is different: hiding navigation locks a coach out of
      // their own team, while an extra nav item is a moment of confusion. Never let a
      // dropped request remove someone's route to their data.
      const failed = tm.status === "rejected" || plys.status === "rejected" || prof.status === "rejected";

      setScope({
        status: failed ? "unknown" : "ready",
        team,
        players,
        recruiterProfile,
        hasTeam: failed || !!team?.team,
        hasPlayers: failed || players.length > 0,
        hasRecruiterProfile: failed || !!recruiterProfile,
      });
    })();
    return () => { active = false; };
  }, []);

  return <Ctx.Provider value={scope}>{children}</Ctx.Provider>;
}
