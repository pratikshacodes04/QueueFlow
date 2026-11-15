"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User, Settings, Activity, ExternalLink, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getInitials } from "@/utils/formatters";
import ConfirmationDialog from "./ConfirmationDialog";

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const dropdownRef = useRef(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setShowLogoutDialog(false);
    setIsOpen(false);
    logout(); // clears token + state; AppShell redirects to /login
  };

  return (
    <>
      <div className="nav-action-wrapper" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.25rem 0.5rem",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-subtle)",
            backgroundColor: "var(--bg-surface)",
            cursor: "pointer",
          }}
          aria-label="User profile menu"
        >
          <div className="manager-avatar" style={{ width: 28, height: 28, fontSize: "0.75rem" }}>
            {getInitials(user?.name)}
          </div>
          <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-primary)" }}>
            {user?.name || "Manager"}
          </span>
          <ChevronDown size={14} color="var(--text-muted)" />
        </button>

        {isOpen && (
          <div className="dropdown-menu" style={{ width: 230 }}>
            <div className="dropdown-header">
              <div className="dropdown-title">{user?.name || "Manager"}</div>
              <div className="dropdown-subtitle">{user?.email || ""}</div>
            </div>

            <div className="dropdown-list">
              <Link
                href="/settings"
                className="dropdown-item"
                onClick={() => setIsOpen(false)}
              >
                <User size={15} />
                <span>Profile Settings</span>
              </Link>

              <Link
                href="/settings"
                className="dropdown-item"
                onClick={() => setIsOpen(false)}
              >
                <Settings size={15} />
                <span>Workspace Preferences</span>
              </Link>

              <Link
                href="/system"
                className="dropdown-item"
                onClick={() => setIsOpen(false)}
              >
                <Activity size={15} />
                <span>Backend Health Status</span>
              </Link>

              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="dropdown-item"
                onClick={() => setIsOpen(false)}
              >
                <ExternalLink size={15} />
                <span>FastAPI OpenAPI Docs</span>
              </a>

              <button
                type="button"
                className="dropdown-item danger"
                onClick={() => {
                  setIsOpen(false);
                  setShowLogoutDialog(true);
                }}
                style={{ width: "100%", textAlign: "left" }}
              >
                <LogOut size={15} />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={handleLogout}
        title="Sign Out of QueueFlow"
        message="Are you sure you want to end your current session? You can sign back in at any time."
        confirmText="Sign Out"
        isDestructive={false}
      />
    </>
  );
}

