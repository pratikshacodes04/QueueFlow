"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, ChevronRight, Home } from "lucide-react";
import NotificationDropdown from "./NotificationDropdown";
import ProfileDropdown from "./ProfileDropdown";
import Modal from "./Modal";
import { useQueue } from "@/context/QueueContext";

export default function Navbar({ onOpenMobile }) {
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { queues, tokens } = useQueue();

  // Dynamic breadcrumb generation
  const getBreadcrumbs = () => {
    if (pathname === "/" || pathname === "/dashboard") {
      return [{ label: "Dashboard", href: "/dashboard" }];
    }
    if (pathname === "/queues") {
      return [
        { label: "Dashboard", href: "/dashboard" },
        { label: "My Queues", href: "/queues" },
      ];
    }
    if (pathname.startsWith("/queues/")) {
      const queueId = pathname.replace("/queues/", "");
      const queue = queues.find((q) => q.id === queueId);
      return [
        { label: "Dashboard", href: "/dashboard" },
        { label: "My Queues", href: "/queues" },
        { label: queue ? queue.name : queueId, href: pathname },
      ];
    }
    if (pathname === "/tokens") {
      return [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Token Management", href: "/tokens" },
      ];
    }
    if (pathname === "/analytics") {
      return [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Analytics & Insights", href: "/analytics" },
      ];
    }
    if (pathname === "/settings") {
      return [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Settings", href: "/settings" },
      ];
    }
    if (pathname === "/system") {
      return [
        { label: "Dashboard", href: "/dashboard" },
        { label: "System Health Status", href: "/system" },
      ];
    }
    return [{ label: "Dashboard", href: "/dashboard" }];
  };

  const breadcrumbs = getBreadcrumbs();

  // Quick search results
  const filteredQueues = searchQuery.trim()
    ? queues.filter(
        (q) =>
          q.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const filteredTokens = searchQuery.trim()
    ? tokens.filter(
        (t) =>
          t.tokenNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.customerName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <>
      <header className="top-navbar">
        <div className="top-nav-left">
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={onOpenMobile}
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>

          <nav className="breadcrumbs" aria-label="Breadcrumbs">
            <Link href="/dashboard" className="breadcrumb-item" aria-label="Home">
              <Home size={14} />
            </Link>
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.href + idx}>
                  <ChevronRight size={12} className="breadcrumb-separator" />
                  {isLast ? (
                    <span className="breadcrumb-current">{crumb.label}</span>
                  ) : (
                    <Link href={crumb.href} className="breadcrumb-item">
                      {crumb.label}
                    </Link>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        </div>

        <div className="top-nav-right">
          {/* Quick Search Trigger */}
          <button
            type="button"
            className="search-trigger-btn"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Search queues and tokens"
          >
            <Search size={14} />
            <span>Search queues, tokens...</span>
            <kbd className="search-kbd">⌘K</kbd>
          </button>

          {/* Activity Notifications */}
          <NotificationDropdown />

          {/* User Manager Profile */}
          <ProfileDropdown />
        </div>
      </header>

      {/* Global Quick Search Modal */}
      <Modal
        isOpen={isSearchOpen}
        onClose={() => {
          setIsSearchOpen(false);
          setSearchQuery("");
        }}
        title="Quick Navigator & Search"
        maxWidth="540px"
      >
        <div className="input-with-icon" style={{ marginBottom: "1.25rem" }}>
          <span className="input-icon-left">
            <Search size={16} />
          </span>
          <input
            type="text"
            className="form-input"
            placeholder="Type a queue name, code (e.g. TECH), or token number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          {searchQuery.trim() === "" ? (
            <div style={{ textAlign: "center", padding: "1.5rem 0", color: "var(--text-muted)", fontSize: "0.8125rem" }}>
              Start typing to quickly search queues or customer tokens.
            </div>
          ) : filteredQueues.length === 0 && filteredTokens.length === 0 ? (
            <div style={{ textAlign: "center", padding: "1.5rem 0", color: "var(--text-muted)", fontSize: "0.8125rem" }}>
              No queues or tokens found for &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {filteredQueues.length > 0 && (
                <div>
                  <div style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: "0.5rem" }}>
                    Queues ({filteredQueues.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    {filteredQueues.map((q) => (
                      <Link
                        key={q.id}
                        href={`/queues/${q.id}`}
                        onClick={() => {
                          setIsSearchOpen(false);
                          setSearchQuery("");
                        }}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.5rem 0.75rem",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "var(--bg-surface-subtle)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{q.name}</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                            #{q.id} ({q.code})
                          </span>
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 500 }}>
                          View Queue →
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {filteredTokens.length > 0 && (
                <div>
                  <div style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-subtle)", marginBottom: "0.5rem" }}>
                    Tokens ({filteredTokens.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    {filteredTokens.map((t) => (
                      <Link
                        key={t.id}
                        href="/tokens"
                        onClick={() => {
                          setIsSearchOpen(false);
                          setSearchQuery("");
                        }}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.5rem 0.75rem",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "var(--bg-surface-subtle)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        <div>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--primary)" }}>
                            #{t.tokenNumber}
                          </span>
                          <span style={{ fontWeight: 500, color: "var(--text-primary)", marginLeft: "0.75rem" }}>
                            {t.customerName}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                            ({t.queueName})
                          </span>
                        </div>
                        <span style={{ fontSize: "0.6875rem", textTransform: "capitalize", color: "var(--text-secondary)" }}>
                          {t.status}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
