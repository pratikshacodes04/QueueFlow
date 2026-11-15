"use client";

import React, { createContext, useContext, useState } from "react";
import { APP_CONFIG } from "@/utils/constants";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [appState, setAppState] = useState({
    title: APP_CONFIG.name,
    tagline: APP_CONFIG.tagline,
    lastRefreshed: null,
  });

  const updateLastRefreshed = () => {
    setAppState((prev) => ({
      ...prev,
      lastRefreshed: new Date().toISOString(),
    }));
  };

  return (
    <AppContext.Provider value={{ appState, updateLastRefreshed }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}

