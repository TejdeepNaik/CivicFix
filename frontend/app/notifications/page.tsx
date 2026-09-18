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
    <div className="space-y-5 max-w-3xl mx-auto py-4 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="space-y-0.5">
          <span className="text-xs font-bold text-sky-700 uppercase tracking-wider block">
            Government Communications
          </span>
          <h1 className="text-xl font-black text-slate-900">
            Inbox & Alerts
          </h1>
          <p className="text-xs text-slate-600">
            Official department notifications regarding your reported issues and verification requests.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="btn-gov-secondary text-xs px-3.5 py-1.5 shrink-0"
          >
            {markingAll ? "Marking..." : `Mark all read (${unreadCount})`}
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-md bg-slate-100 border border-slate-200 w-fit">
        <TabButton active={!unreadOnly} onClick={() => setUnreadOnly(false)}>
          All
        </TabButton>
        <TabButton active={unreadOnly} onClick={() => setUnreadOnly(true)}>
          Unread{unreadCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-sky-600 text-white">
              {unreadCount}
            </span>
          )}
        </TabButton>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="p-3.5 rounded bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold">
          {error}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon="🔔"
          title={unreadOnly ? "No unread alerts" : "No notifications yet"}
          description={
            unreadOnly
              ? "You have no unread notifications at this time."
              : "Official department notifications will appear here as your reports progress."
          }
        />
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.label} className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

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
      className={`flex items-start gap-3 p-3.5 rounded-lg border transition-all gov-card ${
        !n.is_read
          ? "border-sky-300 bg-sky-50/50 shadow-xs"
          : "border-slate-200 bg-white"
      }`}
    >
      <div
        className={`w-8 h-8 rounded flex items-center justify-center text-sm shrink-0 ${
          !n.is_read ? "bg-sky-100 border border-sky-300 text-sky-900" : "bg-slate-100 border border-slate-200 text-slate-600"
        }`}
      >
        {icon}
      </div>

      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-900 capitalize">
            {n.notification_type.replace(/_/g, " ")}
          </span>
          {!n.is_read && (
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-600 text-white">
              UNREAD
            </span>
          )}
        </div>

        <p className="text-xs text-slate-700 leading-relaxed">{n.message}</p>

        <div className="flex items-center gap-3 pt-0.5">
          <span className="text-[10px] text-slate-400 font-mono">{timeStr}</span>
          {n.complaint_id && (
            <Link
              href={`/complaints/${n.complaint_id}`}
              className="text-[11px] text-sky-700 hover:underline font-bold transition-colors"
            >
              View Case File →
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
      className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center ${
        active
          ? "bg-[#0f2942] text-white shadow-xs"
          : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}
