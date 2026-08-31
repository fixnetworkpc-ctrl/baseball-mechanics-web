import { cn } from "@/lib/utils";

/**
 * The house mark over the product line.
 *
 * MechanicsIQ is the brand; "Recruiter Portal" / "Coach Portal" is what this particular
 * surface is. Putting the house mark on the bold line and the product underneath is the
 * same hierarchy mechanicsiq.com uses, so the app, the marketing site and the portal all
 * present one brand instead of three.
 *
 * 🔴 This is load-bearing for the USPTO filing, not just cosmetics. The public /login page
 * is the Class 42 (SaaS) specimen — an examiner has to see MECHANICSIQ on the page that
 * offers the online service. Removing the mark here weakens that class.
 *
 * Single source of truth: the identical badge + two-line block was pasted into the login
 * hero and the sidebar, and they had already drifted apart on badge size.
 */
export function Wordmark({
  label,
  onDark = false,
  badgeClassName,
  className,
}: {
  /** The product line under the house mark, e.g. "Recruiter Portal". */
  label: string;
  /**
   * The login hero sits on a fixed dark gradient in both themes, so it needs
   * white-on-dark muting rather than the theme's `muted-foreground` token, which
   * would go near-invisible there in light mode.
   */
  onDark?: boolean;
  badgeClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground shadow-md",
          badgeClassName,
        )}
      >
        BM
      </div>
      <div className="leading-tight">
        <p
          className={cn(
            "text-sm font-bold",
            onDark ? "text-white" : "text-sidebar-foreground",
          )}
        >
          MechanicsIQ
        </p>
        <p
          className={cn(
            "text-[10px] font-semibold uppercase tracking-widest",
            onDark ? "text-white/60" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
      </div>
    </div>
  );
}
