"use client";

import { useEffect, useState } from "react";
import { getNotifications, markNotificationsRead } from "@/lib/recruiter-service";
import type { AppNotification } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          {unreadCount > 0 && <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" className="ml-auto" onClick={markAllRead}>
            Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : notifications.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <p className="font-medium">No notifications yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              You&apos;ll be notified when a player you follow improves their score, or when a recruiter saves a player you&apos;re tracking.
            </p>
          </CardContent>
        </Card>
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
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">{n.player_name}</p>
                  )}
                </div>
                {!n.read && <span className="mt-1 size-2 rounded-full bg-blue-500 shrink-0" />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
