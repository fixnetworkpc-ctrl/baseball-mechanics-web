import { BadgeCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { VerificationEntry } from "@/lib/types";

/**
 * Verification attribution for one measurable, recruiter-facing.
 *
 * 🔴 THREE STATES, NEVER TWO. `value_changed` means a coach attested one number and the
 * profile now claims another — collapsing that into either "verified" or "unverified"
 * misleads in opposite directions, and it is precisely the case a recruiter needs to see.
 *
 * An ABSENT entry is not "verified". Older server builds do not send the overlay at all, so
 * a missing entry must render as nothing (or Self Reported when asked), never as a badge.
 */
export function VerificationChip({
  entry,
  showSelfReported = false,
}: {
  entry?: VerificationEntry;
  showSelfReported?: boolean;
}) {
  if (!entry) return null;

  if (entry.verification_status === "coach_verified") {
    return (
      <Badge variant="outline" className="border-emerald-500/60 text-emerald-500 gap-1">
        <BadgeCheck className="size-3" />
        Coach Verified
      </Badge>
    );
  }

  if (entry.verification_status === "value_changed") {
    return (
      <Badge
        variant="outline"
        className="border-amber-500/60 text-amber-500 gap-1"
        // The attested number stays visible: a changed value is only meaningful next to
        // what was actually verified.
        title={
          entry.verified_value
            ? `A coach verified ${entry.verified_value}. This profile now says ${entry.value}.`
            : "This value changed after it was verified."
        }
      >
        <TriangleAlert className="size-3" />
        Changed since verified
        {entry.verified_value ? (
          <span className="opacity-70">· was {entry.verified_value}</span>
        ) : null}
      </Badge>
    );
  }

  // Deliberately opt-in. On a dense search row, labelling every unverified number would
  // add noise to the common case and dilute the two that carry information.
  if (!showSelfReported) return null;
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Self Reported
    </Badge>
  );
}
