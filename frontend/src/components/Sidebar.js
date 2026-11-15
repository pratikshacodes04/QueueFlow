"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Ticket,
  BarChart3,
  Settings,
  Activity,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Layers as LogoIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getInitials } from "@/utils/formatters";
import ConfirmationDialog from "./ConfirmationDialog";

export default function Sidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const navItems = [
    {
      label: "Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
      isActive: pathname === "/dashboard" || pathname === "/",
    },
    {
      label: "My Queues",
      href: "/queues",
      icon: Layers,
      isActive: pathname.startsWith("/queues"),
    },
    {
      label: "Token Management",
      href: "/tokens",
      icon: Ticket,
      isActive: pathname === "/tokens",
    },
    {
      label: "Analytics",
      href: "/analytics",
      icon: BarChart3,
      isActive: pathname === "/analytics",
    },
    {
      label: "Settings",
      href: "/settings",
      icon: Settings,
      isActive: pathname === "/settings",
    },
    {
      label: "System Health",
      href: "/system",
      icon: Activity,
      isActive: pathname === "/system",
    },
  ];

  const handleLogout = () => {
    setShowLogoutDialog(false);
    onCloseMobile?.();
    logout(); // clears token + state; AppShell redirects to /login
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      <div
        className={`sidebar-overlay ${isMobileOpen ? "active" : ""}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside
        className={`sidebar ${isCollapsed ? "collapsed" : ""} ${
          isMobileOpen ? "mobile-open" : ""
        }`}
      >
        {/* Brand Header */}
        <div className="sidebar-header">
          <Link href="/dashboard" className="brand-wrapper" onClick={onCloseMobile}>
            <div className="brand-logo-icon">
              <LogoIcon size={20} />
            </div>
            <div className="brand-meta">
              <span className="brand-name">QueueFlow</span>
              <span className="brand-badge">Enterprise</span>
            </div>
          </Link>

          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation items */}
        <div className="sidebar-nav-container">
          <div className="nav-section-label">Operations</div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${item.isActive ? "active" : ""}`}
                onClick={onCloseMobile}
                title={item.label}
              >
                <span className="nav-icon">
                  <Icon size={18} />
                </span>
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Sidebar Footer with Manager Profile */}
        <div className="sidebar-footer">
          <Link href="/settings" className="manager-profile-card" onClick={onCloseMobile}>
            <div className="manager-avatar">{getInitials(user?.name)}</div>
            <div className="manager-details">
              <span className="manager-name">{user?.name || "Manager"}</span>
              <span className="manager-role">{user?.email || "QueueFlow Manager"}</span>
            </div>
          </Link>

          <button
            type="button"
            className="logout-nav-item"
            onClick={() => setShowLogoutDialog(true)}
            title="Log Out"
          >
            <LogOut size={16} />
            <span className="nav-label">Log Out</span>
          </button>
        </div>
      </aside>

      <ConfirmationDialog
        isOpen={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={handleLogout}
        title="Sign Out of QueueFlow"
        message="Are you sure you want to end your manager session?"
        confirmText="Sign Out"
        isDestructive={false}
      />
    </>
  );
}

