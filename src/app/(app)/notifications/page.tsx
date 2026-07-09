"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { getNotifications, markNotificationsRead } from "@/lib/recruiter-service";
import type { AppNotification } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await getNotifications();
        if (!active) return;
        setNotifications(data);
        const unreadIds = data.filter((n) => !n.read).map((n) => n.id);
        if (unreadIds.length > 0) markNotificationsRead(unreadIds);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  async function markAllRead() {
    await markNotificationsRead([]);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        eyebrow="Activity"
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
        actions={
          unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              Mark all read
            </Button>
          )
        }
      />

      {loading ? (
        <LoadingState rows={2} withTitle={false} />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          body="You'll be notified when a player you follow improves their score, or when a recruiter saves a player you're tracking."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card key={n.id}>
              <CardContent className="flex items-start gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm font-semibold", !n.read ? "text-foreground" : "text-muted-foreground")}>
                      {n.title}
                    </p>
                    <span className="text-xs text-muted-foreground shrink-0">{timeAgo(n.created_at)}</span>
                  </div>
                  {n.body && <p className="text-sm mt-1">{n.body}</p>}
                  {n.player_name && (
                    <p className="mt-1 text-xs font-bold text-accent-blue">{n.player_name}</p>
                  )}
                </div>
                {!n.read && (
                  <span
                    role="img"
                    aria-label="Unread"
                    className="mt-1 size-2 shrink-0 rounded-full bg-accent-blue"
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
