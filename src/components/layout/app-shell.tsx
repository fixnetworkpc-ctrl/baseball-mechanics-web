"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { recruiterSignOut } from "@/lib/recruiter-service";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

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

  async function handleSignOut() {
    await recruiterSignOut();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen flex-1">
      {/* Desktop sidebar */}
      <aside className="hidden md:block">
        <Sidebar email={email} onSignOut={handleSignOut} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 top-0 h-full shadow-2xl">
            <Sidebar
              email={email}
              onSignOut={handleSignOut}
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setDrawerOpen(true)} />
        <main className="mx-auto w-full max-w-6xl flex-1 p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
