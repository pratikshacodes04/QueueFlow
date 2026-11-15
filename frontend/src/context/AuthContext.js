"use client";

/**
 * Manager authentication state for QueueFlow.
 *
 * - Reuses the existing token storage in services/api.js (getAuthToken / setAuthToken).
 * - The backend is the source of truth: on load, a stored token is validated
 *   with GET /auth/me before the manager is treated as signed in.
 * - Any protected API call that returns 401 signs the manager out (see
 *   setUnauthorizedHandler in services/api.js).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getAuthToken,
  setAuthToken,
  setUnauthorizedHandler,
  loginManager,
  registerManager,
  getCurrentUser,
} from "@/services/api";

const AuthContext = createContext(null);

const MAX_TIMEOUT_MS = 2147483647; // setTimeout upper bound

/** Read the `exp` claim (seconds) from a JWT without verifying it. */
function readTokenExpiryMs(token) {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const { exp } = JSON.parse(json);
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  // loading | authenticated | unauthenticated | error
  const [status, setStatus] = useState("loading");
  const [user, setUser] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  // One-shot message shown on the login page ({ type, text, email? })
  const [notice, setNotice] = useState(null);

  const statusRef = useRef(status);
  statusRef.current = status;

  const clearSession = useCallback((nextNotice = null) => {
    setAuthToken(null);
    setUser(null);
    setErrorMessage("");
    setNotice(nextNotice);
    setStatus("unauthenticated");
  }, []);

  /** Validate any stored token with the backend. */
  const bootstrap = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setStatus("unauthenticated");
      return;
    }
    setStatus("loading");
    setErrorMessage("");
    try {
      const me = await getCurrentUser();
      setUser(me);
      setStatus("authenticated");
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        clearSession({
          type: "info",
          text:
            err.status === 403
              ? "This account has been deactivated."
              : "Your session has expired. Please sign in again.",
        });
      } else {
        // Backend unreachable: keep the token, let the manager retry.
        setStatus("error");
        setErrorMessage(
          err.status === 408 || err.name === "TypeError"
            ? "Cannot reach the QueueFlow server. Check that the backend is running."
            : err.message || "Unable to verify your session."
        );
      }
    }
  }, [clearSession]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Central session-expiry: a protected request got 401.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (statusRef.current === "authenticated" || getAuthToken()) {
        clearSession({
          type: "info",
          text: "Your session has expired. Please sign in again.",
        });
      }
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  // Sign out when the token's own expiry time passes.
  useEffect(() => {
    if (status !== "authenticated") return undefined;
    const token = getAuthToken();
    const expiresAt = token ? readTokenExpiryMs(token) : null;
    if (!expiresAt) return undefined;
    const delay = Math.min(Math.max(expiresAt - Date.now(), 0), MAX_TIMEOUT_MS);
    const timer = setTimeout(() => {
      clearSession({ type: "info", text: "Your session has expired. Please sign in again." });
    }, delay);
    return () => clearTimeout(timer);
  }, [status, clearSession]);

  // Back/forward cache restores and sign-out in another tab.
  useEffect(() => {
    const recheck = () => {
      if (statusRef.current === "authenticated" && !getAuthToken()) {
        clearSession({ type: "info", text: "You have been signed out." });
      }
    };
    const onPageShow = (event) => {
      if (event.persisted) recheck();
    };
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("storage", recheck);
    window.addEventListener("focus", recheck);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("storage", recheck);
      window.removeEventListener("focus", recheck);
    };
  }, [clearSession]);

  const login = useCallback(
    async ({ email, password }) => {
      const data = await loginManager({ email, password });
      if (!data || !data.access_token) {
        throw new Error("The server returned an unexpected response.");
      }
      setAuthToken(data.access_token);
      try {
        const me = await getCurrentUser();
        setUser(me);
        setNotice(null);
        setStatus("authenticated");
        return me;
      } catch (err) {
        setAuthToken(null);
        throw err;
      }
    },
    []
  );

  const register = useCallback(async (form) => {
    const result = await registerManager(form);
    setNotice({
      type: "success",
      text: "Account created. Sign in to continue.",
      email: result?.user?.email || form.email.trim().toLowerCase(),
    });
    return result;
  }, []);

  const logout = useCallback(() => {
    clearSession({ type: "info", text: "You have been signed out." });
  }, [clearSession]);

  const consumeNotice = useCallback(() => setNotice(null), []);

  const value = useMemo(
    () => ({
      status,
      user,
      errorMessage,
      notice,
      isAuthenticated: status === "authenticated",
      login,
      register,
      logout,
      retry: bootstrap,
      consumeNotice,
    }),
    [status, user, errorMessage, notice, login, register, logout, bootstrap, consumeNotice]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
