"use client";

// Frontend context for QueueFlow
// Connected to FastAPI backend with real MongoDB persistence

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  getAnalyticsOverview,
  getQueues,
  createQueue as apiCreateQueue,
  updateQueue as apiUpdateQueue,
  setQueueStatus as apiSetQueueStatus,
  createToken as apiCreateToken,
  listTokens as apiListTokens,
  moveToken as apiMoveToken,
  cancelToken as apiCancelToken,
  callNextToken as apiCallNextToken,
  completeToken as apiCompleteToken,
  getQueueTokenStats as apiGetQueueTokenStats,
} from "@/services/api";
import { useToast } from "@/context/ToastContext";

const QueueContext = createContext(null);

/**
 * Normalizes backend TokenOut objects into structures safe for existing
 * frontend consumers while strictly preserving backend values and status.
 */
export function normalizeToken(raw) {
  if (!raw) return null;
  const status = raw.status || "WAITING";
  return {
    ...raw,
    id: raw.id || raw._id,
    token_number: raw.token_number,
    tokenNumber: raw.token_number,
    queue_id: raw.queue_id,
    queueId: raw.queue_id,
    customer_name: raw.customer_name,
    customerName: raw.customer_name,
    customer_phone: raw.customer_phone,
    customerPhone: raw.customer_phone,
    customerEmail: raw.customer_phone || "",
    status: status,
    position: raw.position,
    created_at: raw.created_at,
    arrivalTime: raw.created_at
      ? new Date(raw.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—",
    called_at: raw.called_at,
    serviceStartTime: raw.called_at
      ? new Date(raw.called_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null,
    completed_at: raw.completed_at,
    cancelled_at: raw.cancelled_at,
  };
}

export function QueueProvider({ children }) {
  // Operational state - live data from backend (no mock token fallbacks)
  const [queues, setQueues] = useState([]);
  const [queuesLoading, setQueuesLoading] = useState(true);
  const [queuesError, setQueuesError] = useState(null);

  const [tokens, setTokens] = useState([]);
  const [activities, setActivities] = useState([]);

  // Concurrency & duplicate submission guard
  const [isOperating, setIsOperating] = useState(false);
  const [operationError, setOperationError] = useState(null);
  const operatingLockRef = useRef(false);

  // Analytics (live KPI) state from Phase 6 Part 3A
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState(null);

  const { addToast } = useToast();

  const addActivity = useCallback((activity) => {
    const newAct = {
      id: "act-" + Date.now(),
      timestamp: "Just now",
      ...activity,
    };
    setActivities((prev) => [newAct, ...prev.slice(0, 19)]);
  }, []);

  // Fetch metrics from backend
  const refetchMetrics = useCallback(async () => {
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const data = await getAnalyticsOverview();
      setMetrics(data);
      return data;
    } catch (e) {
      console.error("Failed to fetch analytics overview:", e);
      setMetricsError(e.message || "Failed to load metrics");
      return null;
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  // Fetch queues from backend
  const refetchQueues = useCallback(async () => {
    setQueuesLoading(true);
    setQueuesError(null);
    try {
      const data = await getQueues();
      const norm = (data || []).map((q) => ({
        ...q,
        id: q.id || q._id,
        name: q.name,
        code: q.code || q.name.substring(0, 4).toUpperCase(),
        description: q.description || "",
        department: q.department || "Operations",
        status: (q.status || "ACTIVE").toLowerCase(),
        rawStatus: q.status || "ACTIVE",
        waitingCount: q.waitingCount || 0,
        currentServing: q.currentServing || "None",
        currentServingCustomer: q.currentServingCustomer || null,
        totalServed: q.totalServed || 0,
        estimatedServiceTime: q.estimatedServiceTime || 5,
        createdAt: q.created_at ? q.created_at.split("T")[0] : "",
      }));
      setQueues(norm);
      return norm;
    } catch (e) {
      console.error("Failed to fetch queues:", e);
      setQueuesError(e.message || "Failed to load queues");
      return [];
    } finally {
      setQueuesLoading(false);
    }
  }, []);

  // Fetch tokens for a specific queue
  const fetchQueueTokens = useCallback(async (queueId) => {
    if (!queueId) return [];
    try {
      const data = await apiListTokens(queueId);
      const normalized = (data || []).map(normalizeToken);
      setTokens((prev) => {
        const remaining = prev.filter(
          (t) => t.queue_id !== queueId && t.queueId !== queueId
        );
        return [...normalized, ...remaining];
      });
      return normalized;
    } catch (e) {
      console.error(`Failed to fetch tokens for queue ${queueId}:`, e);
      throw e;
    }
  }, []);

  // Refresh queue token list and statistics
  const refreshQueueData = useCallback(async (queueId) => {
    if (!queueId) return;
    try {
      const [tokenList, stats] = await Promise.all([
        apiListTokens(queueId).catch(() => []),
        apiGetQueueTokenStats(queueId).catch(() => null),
      ]);
      const normalized = (tokenList || []).map(normalizeToken);
      setTokens((prev) => {
        const remaining = prev.filter(
          (t) => t.queue_id !== queueId && t.queueId !== queueId
        );
        return [...normalized, ...remaining];
      });

      if (stats) {
        const serving = normalized.find(
          (t) => t.status === "SERVING" || t.status === "serving"
        );
        setQueues((prev) =>
          prev.map((q) =>
            q.id === queueId
              ? {
                  ...q,
                  waitingCount: stats.WAITING ?? q.waitingCount,
                  totalServed: stats.COMPLETED ?? q.totalServed,
                  currentServing: serving
                    ? serving.token_number || serving.tokenNumber
                    : "None",
                  currentServingCustomer: serving
                    ? serving.customer_name || serving.customerName
                    : null,
                }
              : q
          )
        );
      }
      return { tokens: normalized, stats };
    } catch (e) {
      console.error(`Failed to refresh queue data for ${queueId}:`, e);
    }
  }, []);

  // Load metrics and queues on initial mount
  useEffect(() => {
    refetchMetrics();
    refetchQueues();
  }, [refetchMetrics, refetchQueues]);

  // ------------------- Queue operations -------------------
  const addQueue = useCallback(
    async (newQueueData) => {
      try {
        const payload = {
          name: newQueueData.name.trim(),
          description: newQueueData.description || "",
          code: newQueueData.code
            ? newQueueData.code.toUpperCase().trim()
            : undefined,
          status: "ACTIVE",
        };
        const created = await apiCreateQueue(payload);
        await refetchQueues();
        refetchMetrics().catch(() => {});

        addActivity({
          type: "queue_created",
          title: "New Queue Created",
          description: `Queue "${created.name}" was successfully established.`,
          badge: "Created",
          badgeType: "success",
        });

        addToast({
          title: "Queue Created",
          message: `"${created.name}" is now ready for tickets.`,
          type: "success",
        });

        return created;
      } catch (err) {
        console.error("addQueue error:", err);
        addToast({
          title: "Failed to Create Queue",
          message: err.message || "Could not establish queue.",
          type: "error",
        });
        throw err;
      }
    },
    [refetchQueues, refetchMetrics, addActivity, addToast]
  );

  const updateQueue = useCallback(
    async (queueId, updates) => {
      try {
        const updated = await apiUpdateQueue(queueId, {
          name: updates.name,
          description: updates.description,
        });
        await refetchQueues();
        addToast({
          title: "Queue Updated",
          message: `Queue details were updated successfully.`,
          type: "success",
        });
        return updated;
      } catch (err) {
        console.error("updateQueue error:", err);
        addToast({
          title: "Failed to Update Queue",
          message: err.message || "Could not update queue.",
          type: "error",
        });
        throw err;
      }
    },
    [refetchQueues, addToast]
  );

  const toggleQueueStatus = useCallback(
    async (queueId) => {
      try {
        const currentQ = queues.find((q) => q.id === queueId);
        const currentStatus = (
          currentQ?.status ||
          currentQ?.rawStatus ||
          "ACTIVE"
        ).toUpperCase();
        const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";

        const updated = await apiSetQueueStatus(queueId, nextStatus);
        await refetchQueues();
        refetchMetrics().catch(() => {});

        addActivity({
          type: "queue_status_changed",
          title: `Queue ${nextStatus === "ACTIVE" ? "Activated" : "Deactivated"}`,
          description: `Queue was set to ${nextStatus.toLowerCase()}.`,
          badge: nextStatus === "ACTIVE" ? "Active" : "Inactive",
          badgeType: nextStatus === "ACTIVE" ? "success" : "danger",
        });

        addToast({
          title: `Queue ${nextStatus === "ACTIVE" ? "Activated" : "Deactivated"}`,
          message: `Queue is now ${nextStatus.toLowerCase()}.`,
          type: nextStatus === "ACTIVE" ? "success" : "info",
        });

        return updated;
      } catch (err) {
        console.error("toggleQueueStatus error:", err);
        addToast({
          title: "Status Update Failed",
          message: err.message || "Could not toggle queue status.",
          type: "error",
        });
        throw err;
      }
    },
    [queues, refetchQueues, refetchMetrics, addActivity, addToast]
  );

  // ------------------- Real Token operations -------------------

  // 1. Add customer token
  const addCustomerToken = useCallback(
    async (queueId, { customerName, customerPhone, customerEmail }) => {
      if (!queueId) throw new Error("queueId is required");
      if (!customerName || !customerName.trim()) {
        throw new Error("Customer name is required");
      }

      if (operatingLockRef.current) {
        throw new Error("An operation is already in progress. Please wait.");
      }

      operatingLockRef.current = true;
      setIsOperating(true);
      setOperationError(null);

      try {
        const phone = (customerPhone || customerEmail || "").trim();
        const rawToken = await apiCreateToken(queueId, {
          customer_name: customerName.trim(),
          customer_phone: phone || null,
        });

        const created = normalizeToken(rawToken);

        await refreshQueueData(queueId);
        refetchMetrics().catch(() => {});

        addActivity({
          type: "customer_added",
          title: "Customer Token Issued",
          description: `Token #${created.token_number} issued for ${created.customer_name}.`,
          badge: "New",
          badgeType: "info",
        });

        addToast({
          title: "Token Issued",
          message: `Ticket #${created.token_number} generated for ${created.customer_name}.`,
          type: "success",
        });

        return created;
      } catch (err) {
        console.error("addCustomerToken error:", err);
        setOperationError(err.message);
        addToast({
          title: "Token Creation Failed",
          message: err.message || "Could not issue ticket.",
          type: "error",
        });
        throw err;
      } finally {
        operatingLockRef.current = false;
        setIsOperating(false);
      }
    },
    [refreshQueueData, refetchMetrics, addActivity, addToast]
  );

  // 2. Call next waiting customer
  const callNextToken = useCallback(
    async (queueId) => {
      if (!queueId) throw new Error("queueId is required");

      if (operatingLockRef.current) {
        throw new Error("An operation is already in progress. Please wait.");
      }

      operatingLockRef.current = true;
      setIsOperating(true);
      setOperationError(null);

      try {
        const rawToken = await apiCallNextToken(queueId);
        const called = normalizeToken(rawToken);

        await refreshQueueData(queueId);
        refetchMetrics().catch(() => {});

        addActivity({
          type: "ticket_called",
          title: "Customer Called",
          description: `Ticket #${called.token_number} (${called.customer_name}) called to desk.`,
          badge: "Serving",
          badgeType: "primary",
        });

        addToast({
          title: "Customer Called",
          message: `Ticket #${called.token_number} is now being served.`,
          type: "success",
        });

        return called;
      } catch (err) {
        console.error("callNextToken error:", err);
        setOperationError(err.message);
        addToast({
          title: "Call Next Failed",
          message: err.message || "Failed to call next customer.",
          type: "error",
        });
        throw err;
      } finally {
        operatingLockRef.current = false;
        setIsOperating(false);
      }
    },
    [refreshQueueData, refetchMetrics, addActivity, addToast]
  );

  // 3. Complete currently serving token
  const completeCurrentToken = useCallback(
    async (tokenOrQueueId, maybeQueueId) => {
      if (!tokenOrQueueId) throw new Error("Token or Queue ID is required");

      if (operatingLockRef.current) {
        throw new Error("An operation is already in progress. Please wait.");
      }

      operatingLockRef.current = true;
      setIsOperating(true);
      setOperationError(null);

      try {
        let tokenId = tokenOrQueueId;
        let queueId = maybeQueueId;

        // If a queueId was provided, resolve the currently SERVING token in that queue
        const servingTokenInQueue = tokens.find(
          (t) =>
            (t.queue_id === tokenOrQueueId || t.queueId === tokenOrQueueId) &&
            (t.status === "SERVING" || t.status === "serving")
        );

        if (servingTokenInQueue) {
          tokenId = servingTokenInQueue.id;
          queueId = tokenOrQueueId;
        } else if (!queueId) {
          const matching = tokens.find((t) => t.id === tokenOrQueueId);
          queueId = matching?.queue_id || matching?.queueId;
        }

        const rawToken = await apiCompleteToken(tokenId);
        const completed = normalizeToken(rawToken);

        if (queueId) {
          await refreshQueueData(queueId);
        }
        refetchMetrics().catch(() => {});

        addActivity({
          type: "ticket_completed",
          title: "Service Completed",
          description: `Ticket #${completed.token_number} completed service.`,
          badge: "Completed",
          badgeType: "success",
        });

        addToast({
          title: "Service Completed",
          message: `Ticket #${completed.token_number} service was completed successfully.`,
          type: "success",
        });

        return completed;
      } catch (err) {
        console.error("completeCurrentToken error:", err);
        setOperationError(err.message);
        addToast({
          title: "Complete Service Failed",
          message: err.message || "Failed to complete service.",
          type: "error",
        });
        throw err;
      } finally {
        operatingLockRef.current = false;
        setIsOperating(false);
      }
    },
    [tokens, refreshQueueData, refetchMetrics, addActivity, addToast]
  );

  // 4. Move token up
  const moveTokenUp = useCallback(
    async (tokenId, queueId) => {
      if (!tokenId) throw new Error("tokenId is required");

      if (operatingLockRef.current) {
        throw new Error("An operation is already in progress. Please wait.");
      }

      operatingLockRef.current = true;
      setIsOperating(true);
      setOperationError(null);

      try {
        let targetQueueId = queueId;
        if (!targetQueueId) {
          const matchingToken = tokens.find((t) => t.id === tokenId);
          targetQueueId = matchingToken?.queue_id || matchingToken?.queueId;
        }

        const rawToken = await apiMoveToken(tokenId, "UP");
        const moved = normalizeToken(rawToken);

        if (targetQueueId) {
          await refreshQueueData(targetQueueId);
        }

        return moved;
      } catch (err) {
        console.error("moveTokenUp error:", err);
        setOperationError(err.message);
        addToast({
          title: "Move Failed",
          message: err.message || "Failed to move token.",
          type: "error",
        });
        throw err;
      } finally {
        operatingLockRef.current = false;
        setIsOperating(false);
      }
    },
    [tokens, refreshQueueData, addToast]
  );

  // 5. Move token down
  const moveTokenDown = useCallback(
    async (tokenId, queueId) => {
      if (!tokenId) throw new Error("tokenId is required");

      if (operatingLockRef.current) {
        throw new Error("An operation is already in progress. Please wait.");
      }

      operatingLockRef.current = true;
      setIsOperating(true);
      setOperationError(null);

      try {
        let targetQueueId = queueId;
        if (!targetQueueId) {
          const matchingToken = tokens.find((t) => t.id === tokenId);
          targetQueueId = matchingToken?.queue_id || matchingToken?.queueId;
        }

        const rawToken = await apiMoveToken(tokenId, "DOWN");
        const moved = normalizeToken(rawToken);

        if (targetQueueId) {
          await refreshQueueData(targetQueueId);
        }

        return moved;
      } catch (err) {
        console.error("moveTokenDown error:", err);
        setOperationError(err.message);
        addToast({
          title: "Move Failed",
          message: err.message || "Failed to move token.",
          type: "error",
        });
        throw err;
      } finally {
        operatingLockRef.current = false;
        setIsOperating(false);
      }
    },
    [tokens, refreshQueueData, addToast]
  );

  // 6. Cancel token
  const cancelToken = useCallback(
    async (tokenId, queueId) => {
      if (!tokenId) throw new Error("tokenId is required");

      if (operatingLockRef.current) {
        throw new Error("An operation is already in progress. Please wait.");
      }

      operatingLockRef.current = true;
      setIsOperating(true);
      setOperationError(null);

      try {
        let targetQueueId = queueId;
        if (!targetQueueId) {
          const matchingToken = tokens.find((t) => t.id === tokenId);
          targetQueueId = matchingToken?.queue_id || matchingToken?.queueId;
        }

        const rawToken = await apiCancelToken(tokenId);
        const cancelled = normalizeToken(rawToken);

        if (targetQueueId) {
          await refreshQueueData(targetQueueId);
        }
        refetchMetrics().catch(() => {});

        addActivity({
          type: "ticket_cancelled",
          title: "Ticket Cancelled",
          description: `Ticket #${cancelled.token_number} was cancelled.`,
          badge: "Cancelled",
          badgeType: "danger",
        });

        addToast({
          title: "Ticket Cancelled",
          message: `Ticket #${cancelled.token_number} was successfully cancelled.`,
          type: "info",
        });

        return cancelled;
      } catch (err) {
        console.error("cancelToken error:", err);
        setOperationError(err.message);
        addToast({
          title: "Cancellation Failed",
          message: err.message || "Failed to cancel ticket.",
          type: "error",
        });
        throw err;
      } finally {
        operatingLockRef.current = false;
        setIsOperating(false);
      }
    },
    [tokens, refreshQueueData, refetchMetrics, addActivity, addToast]
  );

  // ------------------- Derived KPI metrics -------------------
  const derivedMetrics = metrics?.kpis
    ? {
        totalQueues: metrics.kpis.total_queues,
        totalCustomersToday: metrics.kpis.total_tokens,
        currentlyWaiting: metrics.kpis.currently_waiting,
        currentlyServing: metrics.kpis.currently_serving,
        customersServed: metrics.kpis.completed,
        cancelledCount: metrics.kpis.cancelled,
        averageWaitingTime:
          metrics.kpis.avg_wait_minutes !== null &&
          metrics.kpis.avg_wait_minutes !== undefined
            ? `${metrics.kpis.avg_wait_minutes} min`
            : "-",
        avgServiceDuration:
          metrics.kpis.avg_service_minutes !== null &&
          metrics.kpis.avg_service_minutes !== undefined
            ? `${metrics.kpis.avg_service_minutes} min`
            : "-",
      }
    : {};

  const value = {
    queues,
    queuesLoading,
    queuesError,
    refetchQueues,
    tokens,
    fetchQueueTokens,
    refreshQueueData,
    activities,
    metrics: derivedMetrics,
    metricsLoading,
    metricsError,
    refetchMetrics,
    addQueue,
    updateQueue,
    toggleQueueStatus,
    addCustomerToken,
    callNextToken,
    completeCurrentToken,
    moveTokenUp,
    moveTokenDown,
    cancelToken,
    isOperating,
    operationError,
  };

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
}

export function useQueue() {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error("useQueue must be used within a QueueProvider");
  }
  return context;
}
