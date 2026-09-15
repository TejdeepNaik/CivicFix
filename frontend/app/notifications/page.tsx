"use client";

import React, { useEffect, useState } from "react";
import ProtectedRoute from "../../components/ProtectedRoute";
import { SkeletonCard } from "../../components/Skeleton";
import { EmptyState } from "../../components/EmptyState";
import {
  listNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
} from "../../lib/api";
import { Notification } from "../../lib/types";
import Link from "next/link";

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <NotificationsContent />
    </ProtectedRoute>
  );
}

function NotificationsContent() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async () => {
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
  };

  useEffect(() => {
    fetchNotifications();
  }, [unreadOnly]);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationReadApi(id);
      fetchNotifications();
    } catch (err: any) {
      alert(err.message || "Failed to mark notification as read");
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsReadApi();
      fetchNotifications();
    } catch (err: any) {
      alert(err.message || "Failed to mark all notifications as read");
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Notifications Center</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Stay informed about your reported complaints and department workflow progress.
          </p>
        </div>

        {notifications.some((n) => !n.is_read) && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="btn-civic-secondary text-xs px-4 py-2"
          >
            {markingAll ? "Marking..." : "✓ Mark All as Read"}
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setUnreadOnly(false)}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            !unreadOnly
              ? "bg-teal-950 text-teal-300 border border-teal-800"
              : "text-slate-400 hover:text-white"
          }`}
        >
          All Notifications
        </button>
        <button
          onClick={() => setUnreadOnly(true)}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            unreadOnly
              ? "bg-teal-950 text-teal-300 border border-teal-800"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Unread Only
        </button>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-medium">
          {error}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="No notifications"
          description={
            unreadOnly
              ? "You have no unread notifications at this time."
              : "You haven't received any notifications yet."
          }
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`glass-panel p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                !n.is_read ? "border-l-4 border-l-teal-400 bg-teal-950/20" : "opacity-80"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-white capitalize">{n.notification_type.replace(/_/g, " ")}</span>
                  {!n.is_read && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-500 text-slate-950">
                      NEW
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
                <span className="text-[10px] text-slate-500 block">
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                {n.complaint_id && (
                  <Link
                    href={`/complaints/${n.complaint_id}`}
                    className="btn-civic-secondary text-xs px-3.5 py-1.5"
                  >
                    View Report →
                  </Link>
                )}
                {!n.is_read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="text-xs text-teal-400 hover:underline font-semibold"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
