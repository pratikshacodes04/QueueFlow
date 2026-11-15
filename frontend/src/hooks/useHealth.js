"use client";

import { useState, useEffect, useCallback } from "react";
import { getBackendHealth } from "@/services/api";

export function useHealth() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBackendHealth();
      setHealthData(data);
    } catch (err) {
      setError(err.message || "Failed to reach backend server");
      setHealthData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return { healthData, loading, error, refreshHealth: checkHealth };
}

