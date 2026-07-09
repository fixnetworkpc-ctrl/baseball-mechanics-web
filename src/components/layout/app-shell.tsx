"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { recruiterSignOut } from "@/lib/recruiter-service";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// App frame: fixed sidebar on desktop, slide-in drawer on mobile, glass top bar.
export function AppShell({
  email,
  children,
}: {
  email: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  async function handleSignOut() {
    await recruiterSignOut();
    router.replace("/login");
  }

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // While the drawer is open it behaves as a modal dialog: Escape closes it,
  // Tab is trapped inside it, the page behind it can't scroll, and focus
  // returns to the menu button on close.
  useEffect(() => {
    if (!drawerOpen) return;
    const opener = menuButtonRef.current;

    const focusables = () =>
      Array.from(drawerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);

    focusables()[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDrawer();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      opener?.focus();
    };
  }, [drawerOpen, closeDrawer]);

  return (
    <div className="flex min-h-screen flex-1">
      <a
        href="#main-content"
        className="sr-only rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60]"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden md:block">
        <Sidebar email={email} onSignOut={handleSignOut} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeDrawer}
            aria-hidden
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute left-0 top-0 h-full shadow-2xl"
          >
            <Sidebar email={email} onSignOut={handleSignOut} onNavigate={closeDrawer} />
          </div>
        </div>
      )}

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          onMenu={() => setDrawerOpen(true)}
          menuButtonRef={menuButtonRef}
          drawerOpen={drawerOpen}
        />
        <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 p-5 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
