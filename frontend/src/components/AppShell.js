"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Layers, WifiOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { QueueProvider } from "@/context/QueueContext";
import DashboardLayout from "@/components/DashboardLayout";

const PUBLIC_ROUTES = ["/login", "/register"];

function FullScreenState({ label, children }) {
  return (
    <div className="auth-fullscreen" role="status" aria-live="polite">
      <div className="auth-fullscreen-card">
        <div className="auth-logo-mark">
          <Layers size={22} />
        </div>
        {children || (
          <>
            <div className="auth-spinner auth-spinner-dark" aria-hidden="true" />
            <p>{label}</p>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Route guard + layout switcher.
 *  - /login and /register render bare (no sidebar/navbar) and bounce signed-in managers to /dashboard.
 *  - Every other route renders only for an authenticated manager.
 *  - QueueProvider mounts only inside the authenticated area, so no protected API
 *    calls fire while signed out and all queue state is discarded on sign-out.
 */
export default function AppShell({ children }) {
  const { status, errorMessage, retry, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (status === "unauthenticated" && !isPublic) {
      router.replace("/login");
    } else if (status === "authenticated" && isPublic) {
      router.replace("/dashboard");
    }
  }, [status, isPublic, router]);

  if (status === "loading") {
    return <FullScreenState label="Checking your session…" />;
  }

  if (status === "error") {
    return (
      <FullScreenState>
        <div className="auth-fullscreen-icon">
          <WifiOff size={20} />
        </div>
        <h1 className="auth-fullscreen-title">Can&apos;t verify your session</h1>
        <p>{errorMessage}</p>
        <div className="auth-fullscreen-actions">
          <button type="button" className="btn btn-primary" onClick={retry}>
            Try again
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={logout}
          >
            Sign out
          </button>
        </div>
      </FullScreenState>
    );
  }

  if (isPublic) {
    if (status === "authenticated") {
      return <FullScreenState label="Opening your dashboard…" />;
    }
    return <>{children}</>;
  }

  if (status !== "authenticated") {
    return <FullScreenState label="Redirecting to sign in…" />;
  }

  return (
    <QueueProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </QueueProvider>
  );
}
