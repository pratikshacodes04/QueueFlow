"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bell, Check, Clock, UserCheck, AlertTriangle } from "lucide-react";
import { useQueue } from "@/context/QueueContext";
import { useToast } from "@/context/ToastContext";

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [unread, setUnread] = useState(true);
  const dropdownRef = useRef(null);
  const { activities } = useQueue();
  const { addToast } = useToast();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnread(false);
    }
  };

  const handleClearAll = () => {
    setIsOpen(false);
    addToast({
      title: "Notifications Cleared",
      message: "All queue alerts marked as read.",
      type: "info",
    });
  };

  return (
    <div className="nav-action-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className="icon-button"
        onClick={handleOpen}
        aria-label="View notifications"
        title="Queue Notifications & Alerts"
      >
        <Bell size={18} />
        {unread && <span className="notification-badge" />}
      </button>

      {isOpen && (
        <div className="dropdown-menu" style={{ width: 340 }}>
          <div className="dropdown-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div className="dropdown-title">System Activity</div>
              <div className="dropdown-subtitle">Real-time alerts and queue events</div>
            </div>
            <button
              type="button"
              onClick={handleClearAll}
              style={{ fontSize: "0.6875rem", color: "var(--primary)", fontWeight: 600 }}
            >
              Mark all read
            </button>
          </div>

          <div className="dropdown-list">
            {activities.slice(0, 5).map((act) => (
              <div key={act.id} className="dropdown-item" style={{ alignItems: "flex-start", gap: "0.65rem" }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    backgroundColor:
                      act.badgeType === "success"
                        ? "var(--success-bg)"
                        : act.badgeType === "warning"
                        ? "var(--warning-bg)"
                        : act.badgeType === "danger"
                        ? "var(--danger-bg)"
                        : "var(--primary-subtle)",
                    color:
                      act.badgeType === "success"
                        ? "var(--success)"
                        : act.badgeType === "warning"
                        ? "var(--warning)"
                        : act.badgeType === "danger"
                        ? "var(--danger)"
                        : "var(--primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {act.type === "customer_added" ? (
                    <UserCheck size={13} />
                  ) : act.type === "service_completed" ? (
                    <Check size={13} />
                  ) : act.type === "token_cancelled" ? (
                    <AlertTriangle size={13} />
                  ) : (
                    <Clock size={13} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    {act.title}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2, lineHeight: 1.3 }}>
                    {act.description}
                  </div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--text-subtle)", marginTop: 4 }}>
                    {act.timestamp}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="dropdown-footer">
            <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
              Simulated enterprise activity feed
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

