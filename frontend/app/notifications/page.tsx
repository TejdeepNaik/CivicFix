"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "../../components/ProtectedRoute";
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

function NotificationsContent() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = () => {
    setLoading(true);
    listNotificationsApi({ unread_only: unreadOnly })
      .then((res) => {
        setNotifications(res.items);
        setTotal(res.total);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifications();
  }, [unreadOnly]);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationReadApi(id);
      fetchNotifications();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsReadApi();
      fetchNotifications();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications Center</h1>
          <p className="text-xs text-slate-400">Updates on your reported complaints, status changes, and assignments</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`btn-secondary text-xs px-3 py-1.5 ${
              unreadOnly ? "bg-emerald-950/80 text-emerald-400 border-emerald-800" : ""
            }`}
          >
            {unreadOnly ? "Show All Notifications" : "Filter Unread Only"}
          </button>
          <button
            onClick={handleMarkAllRead}
            className="btn-primary text-xs px-3 py-1.5"
          >
            Mark All as Read
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
          <p className="mt-2 text-xs text-slate-400">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-slate-400 text-sm">No notifications found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`glass-card p-5 space-y-2 border-l-4 transition-colors ${
                n.is_read ? "border-l-slate-700 opacity-85" : "border-l-emerald-500 bg-slate-900/90"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-sm text-white">{n.title}</h3>
                <span className="text-[10px] text-slate-500">{new Date(n.created_at).toLocaleString()}</span>
              </div>
              <p className="text-xs text-slate-300">{n.message}</p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                {n.complaint_id ? (
                  <Link
                    href={`/complaints/${n.complaint_id}`}
                    className="text-emerald-400 font-semibold hover:underline"
                  >
                    View Related Complaint →
                  </Link>
                ) : (
                  <span />
                )}

                {!n.is_read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Mark as Read
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
