"use client";

import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function DashboardLayout({ children }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  return (
    <div className="app-shell">
      {/* Reusable Left Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        isMobileOpen={isMobileDrawerOpen}
        onCloseMobile={() => setIsMobileDrawerOpen(false)}
      />

      {/* Main Content Area with Top Navbar */}
      <div
        className={`main-wrapper ${
          isSidebarCollapsed ? "sidebar-collapsed" : ""
        }`}
      >
        <Navbar onOpenMobile={() => setIsMobileDrawerOpen(true)} />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}

