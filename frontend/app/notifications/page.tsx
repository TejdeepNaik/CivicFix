"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import ProtectedRoute from "../../components/ProtectedRoute";
import { SkeletonCard } from "../../components/Skeleton";
import { EmptyState } from "../../components/EmptyState";
import {
  listNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
} from "../../lib/api";
import { Notification } from "../../lib/types";

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <NotificationsContent />
    </ProtectedRoute>
  );
}

const TYPE_ICONS: Record<string, string> = {
  complaint_submitted:  "📋",
  complaint_assigned:   "🔧",
  complaint_in_progress:"⚙️",
  complaint_resolved:   "✅",
  complaint_closed:     "🏁",
  complaint_rejected:   "❌",
  complaint_reopened:   "🔄",
  worker_assigned:      "👷",
  department_routed:    "🏢",
  verification_request: "🔍",
  default:              "🔔",
};

function getTypeIcon(type: string): string {
  return TYPE_ICONS[type] ?? TYPE_ICONS.default;
}

function groupByDay(notifications: Notification[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; items: Notification[] }[] = [];
  const todayItems: Notification[] = [];
  const yesterdayItems: Notification[] = [];
  const earlierItems: Notification[] = [];

  notifications.forEach((n) => {
    const d = new Date(n.created_at);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) todayItems.push(n);
    else if (d.getTime() === yesterday.getTime()) yesterdayItems.push(n);
    else earlierItems.push(n);
  });

  if (todayItems.length) groups.push({ label: "Today", items: todayItems });
  if (yesterdayItems.length) groups.push({ label: "Yesterday", items: yesterdayItems });
  if (earlierItems.length) groups.push({ label: "Earlier", items: earlierItems });

  return groups;
}

function NotificationsContent() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listNotificationsApi({ unread_only: unreadOnly, size: 50 });
      setNotifications(res.items);
    } catch (err: any) {
      setError(err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationReadApi(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err: any) {
      alert(err.message || "Failed to mark as read");
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsReadApi();
      fetchNotifications();
    } catch (err: any) {
      alert(err.message || "Failed to mark all as read");
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const groups = groupByDay(notifications);

  return (
    <div className="space-y-6 max-w-3xl mx-auto py-4 animate-fade-in">

      {/* ── Header ── */}
      <div className="bg-[#0a2540] text-white p-6 sm:p-8 rounded-2xl border border-slate-700 shadow-md flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
            Inbox & Messages
          </span>
          <h1 className="text-2xl sm:text-3xl font-black">
            311 Service Notifications
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Stay updated on your reported requests and department workflow progress.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="btn-civic-gold text-xs px-4 py-2 shrink-0 shadow-sm"
          >
            {markingAll ? "Marking..." : `Mark all read (${unreadCount})`}
          </button>
        )}
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200 border border-slate-300 w-fit">
        <TabButton active={!unreadOnly} onClick={() => setUnreadOnly(false)}>
          All Notifications
        </TabButton>
        <TabButton active={unreadOnly} onClick={() => setUnreadOnly(true)}>
          Unread{unreadCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-slate-950">
              {unreadCount}
            </span>
          )}
        </TabButton>
      </div>

      {/* ── Notification List ── */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="p-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium">
          {error}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon="🔔"
          title={unreadOnly ? "All caught up!" : "No notifications yet"}
          description={
            unreadOnly
              ? "You have no unread notifications at this time."
              : "Notifications will appear here as your requests progress."
          }
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label} className="space-y-2">
              {/* Group header */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Group items */}
              <div className="space-y-2">
                {group.items.map((n) => (
                  <NotificationRow
                    key={n.id}
                    notification={n}
                    onMarkRead={handleMarkRead}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  notification: n,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const icon = getTypeIcon(n.notification_type);
  const timeStr = new Date(n.created_at).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-xl border transition-all civic-card ${
        !n.is_read
          ? "border-blue-300 bg-blue-50/60"
          : "border-slate-200 bg-white"
      }`}
    >
      {/* Icon */}
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 ${
          !n.is_read ? "bg-blue-100 border border-blue-300 text-blue-900" : "bg-slate-100 border border-slate-200 text-slate-700"
        }`}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-900 capitalize">
            {n.notification_type.replace(/_/g, " ")}
          </span>
          {!n.is_read && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-slate-950">
              NEW
            </span>
          )}
        </div>

        <p className="text-xs text-slate-700 leading-relaxed">{n.message}</p>

        <div className="flex items-center gap-3 pt-1">
          <span className="text-[10px] text-slate-500 font-medium">{timeStr}</span>
          {n.complaint_id && (
            <Link
              href={`/complaints/${n.complaint_id}`}
              className="text-[11px] text-blue-700 hover:underline font-bold transition-colors"
            >
              View Issue →
            </Link>
          )}
          {!n.is_read && (
            <button
              onClick={() => onMarkRead(n.id)}
              className="text-[11px] text-slate-500 hover:text-slate-800 font-medium transition-colors"
            >
              Mark read
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center ${
        active
          ? "bg-[#0a2540] text-white shadow-sm"
          : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}
