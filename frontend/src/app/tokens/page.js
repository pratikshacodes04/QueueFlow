"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import PageHeader from "@/components/PageHeader";
import TokenTable from "@/components/TokenTable";
import AddCustomerModal from "@/components/AddCustomerModal";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import SearchInput from "@/components/SearchInput";
import FilterDropdown from "@/components/FilterDropdown";
import EmptyState from "@/components/EmptyState";
import { useQueue } from "@/context/QueueContext";
import { listTokens } from "@/services/api";
import {
  UserPlus,
  RotateCcw,
  Ticket,
  AlertCircle,
  AlertTriangle,
  PhoneCall,
  Info,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "WAITING", label: "Waiting" },
  { value: "SERVING", label: "Serving" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const TOKENS_PER_QUEUE_LIMIT = 200;

/**
 * Format a raw backend token into the camelCase shape TokenTable expects,
 * enriched with the queue name for the cross-queue view.
 */
function formatTokenForTable(raw, queueName) {
  const status = raw.status || "WAITING";
  return {
    id: raw.id || raw._id,
    tokenNumber: raw.token_number,
    customerName: raw.customer_name,
    customerEmail: raw.customer_phone || "N/A",
    queueName: queueName || "—",
    queueId: raw.queue_id,
    position: raw.position,
    status: status.toLowerCase(),
    rawStatus: status,
    arrivalTime: raw.created_at
      ? new Date(raw.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—",
    created_at: raw.created_at,
    called_at: raw.called_at,
  };
}

export default function TokenManagementPage() {
  const {
    queues,
    queuesLoading,
    moveTokenUp,
    moveTokenDown,
    cancelToken,
    callNextToken,
    isOperating,
  } = useQueue();

  // Local page state — allTokens always holds the UNFILTERED set from the API.
  // Status and search filtering is applied client-side for display only,
  // so queue-specific waiting counts and Call Next remain accurate.
  const [allTokens, setAllTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [partialErrors, setPartialErrors] = useState([]);
  const [actionError, setActionError] = useState(null);

  // Filters
  const [queueFilter, setQueueFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Modals
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [cancellingToken, setCancellingToken] = useState(null);

  // Debounce timer ref
  const debounceRef = useRef(null);

  // Track mount for stale response prevention
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Debounce search input (300ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // ---- Derived queue info ----
  const activeQueues = queues.filter(
    (q) => (q.status || "").toLowerCase() === "active"
  );

  const selectedQueue =
    queueFilter !== "all"
      ? queues.find((q) => q.id === queueFilter)
      : null;

  const isSelectedInactive =
    selectedQueue &&
    (selectedQueue.status || "").toLowerCase() === "inactive";

  const isSelectedActive =
    selectedQueue &&
    (selectedQueue.status || "").toLowerCase() === "active";

  const isAllQueuesView = queueFilter === "all";

  // ---- Data Fetching ----
  // Always fetch without status_filter so we have the full unfiltered set.
  // This lets us compute per-queue waiting counts accurately for Call Next
  // regardless of the current status filter selection.

  const loadTokens = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setPartialErrors([]);
    setActionError(null);

    // When viewing a specific inactive queue, do NOT call listTokens —
    // the backend rejects it with "Cannot operate on an inactive queue".
    if (!isAllQueuesView && isSelectedInactive) {
      setAllTokens([]);
      setLoading(false);
      return;
    }

    // Compute active queues within the callback so the dependency on
    // the `queues` array is captured correctly.
    const currentActiveQueues = queues.filter(
      (q) => (q.status || "").toLowerCase() === "active"
    );

    const queuesToFetch = isAllQueuesView
      ? currentActiveQueues
      : currentActiveQueues.filter((q) => q.id === queueFilter);

    if (queuesToFetch.length === 0 && !queuesLoading) {
      setAllTokens([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch all tokens (no status_filter at API level) so we can
      // derive accurate queue waiting counts for Call Next buttons.
      const apiParams = { limit: TOKENS_PER_QUEUE_LIMIT };

      const results = await Promise.allSettled(
        queuesToFetch.map((q) =>
          listTokens(q.id, apiParams).then((tokens) => ({
            queueId: q.id,
            queueName: q.name,
            tokens: tokens || [],
          }))
        )
      );

      if (!mountedRef.current) return;

      const combined = [];
      const errors = [];

      results.forEach((result, idx) => {
        if (result.status === "fulfilled") {
          const { queueName, tokens } = result.value;
          tokens.forEach((raw) => {
            combined.push(formatTokenForTable(raw, queueName));
          });
        } else {
          const qName = queuesToFetch[idx]?.name || "Unknown Queue";
          const reason =
            result.reason?.message || "Failed to load tokens";
          errors.push(`${qName}: ${reason}`);
        }
      });

      // Sort: SERVING first, then WAITING by position, then others by created_at desc
      combined.sort((a, b) => {
        const statusOrder = { serving: 0, waiting: 1, completed: 2, cancelled: 3 };
        const aOrder = statusOrder[a.status] ?? 9;
        const bOrder = statusOrder[b.status] ?? 9;
        if (aOrder !== bOrder) return aOrder - bOrder;
        if (a.status === "waiting" && b.status === "waiting") {
          return (a.position || 0) - (b.position || 0);
        }
        return (b.created_at || "").localeCompare(a.created_at || "");
      });

      setAllTokens(combined);
      setPartialErrors(errors);

      if (errors.length === queuesToFetch.length && queuesToFetch.length > 0) {
        setLoadError("Failed to load tokens from all queues.");
      }
    } catch (err) {
      if (!mountedRef.current) return;
      console.error("Token management load error:", err);
      setLoadError(
        err.message || "An unexpected error occurred while loading tokens."
      );
      setAllTokens([]);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queuesLoading, queueFilter, queues, isAllQueuesView, isSelectedInactive]);

  // Reload when filters or queues change
  useEffect(() => {
    if (!queuesLoading) {
      loadTokens();
    }
  }, [loadTokens, queuesLoading]);

  // ---- Client-side status + search filtering ----
  // allTokens is the full unfiltered set. Apply status filter and search here.
  const displayedTokens = allTokens.filter((t) => {
    // Status filter
    if (statusFilter !== "all") {
      if ((t.rawStatus || t.status || "").toUpperCase() !== statusFilter) {
        return false;
      }
    }
    // Search filter
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      const matchesName = (t.customerName || "").toLowerCase().includes(q);
      const matchesToken = (t.tokenNumber || "").toLowerCase().includes(q);
      if (!matchesName && !matchesToken) return false;
    }
    return true;
  });

  // ---- Per-queue waiting counts (from unfiltered data) for Call Next buttons ----
  const queueWaitingCounts = {};
  const queueServingCounts = {};
  allTokens.forEach((t) => {
    if (t.status === "waiting") {
      queueWaitingCounts[t.queueId] =
        (queueWaitingCounts[t.queueId] || 0) + 1;
    }
    if (t.status === "serving") {
      queueServingCounts[t.queueId] =
        (queueServingCounts[t.queueId] || 0) + 1;
    }
  });

  // Build the list of active queues with waiting tokens for Call Next buttons
  // (only in All Queues view). Deduplicate by queueId.
  const queuesWithWaiting = isAllQueuesView
    ? activeQueues.filter(
        (q) =>
          (queueWaitingCounts[q.id] || 0) > 0 &&
          !(queueServingCounts[q.id] || 0)
      )
    : [];

  // ---- KPI counts from full unfiltered data ----
  const waitingCount = allTokens.filter((t) => t.status === "waiting").length;
  const servingCount = allTokens.filter((t) => t.status === "serving").length;

  // ---- Action Handlers ----

  const handleMoveUp = async (tokenId) => {
    if (isOperating) return;
    setActionError(null);
    try {
      const token = allTokens.find((t) => t.id === tokenId);
      await moveTokenUp(tokenId, token?.queueId);
      await loadTokens();
    } catch (err) {
      console.error("Move up failed:", err);
      setActionError(err.message || "Failed to move token up.");
    }
  };

  const handleMoveDown = async (tokenId) => {
    if (isOperating) return;
    setActionError(null);
    try {
      const token = allTokens.find((t) => t.id === tokenId);
      await moveTokenDown(tokenId, token?.queueId);
      await loadTokens();
    } catch (err) {
      console.error("Move down failed:", err);
      setActionError(err.message || "Failed to move token down.");
    }
  };

  const handleCancelRequest = (token) => {
    setCancellingToken(token);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingToken || isOperating) return;
    setActionError(null);
    try {
      await cancelToken(cancellingToken.id, cancellingToken.queueId);
      await loadTokens();
    } catch (err) {
      console.error("Cancel failed:", err);
      setActionError(err.message || "Failed to cancel token.");
    } finally {
      setCancellingToken(null);
    }
  };

  /**
   * Call Next for a single-queue view.
   * TokenTable's onCall passes the token object; we extract queueId from it.
   */
  const handleCallNextFromTable = async (token) => {
    if (isOperating) return;
    setActionError(null);
    const targetQueueId = token?.queueId;
    if (!targetQueueId) {
      setActionError("Cannot determine which queue to call next from.");
      return;
    }
    try {
      await callNextToken(targetQueueId);
      await loadTokens();
    } catch (err) {
      console.error("Call next failed:", err);
      setActionError(err.message || "Failed to call next customer.");
    }
  };

  /**
   * Call Next for the All Queues view — triggered by per-queue buttons,
   * not by TokenTable's onCall.
   */
  const handleCallNextForQueue = async (queueId) => {
    if (isOperating) return;
    setActionError(null);
    try {
      await callNextToken(queueId);
      await loadTokens();
    } catch (err) {
      console.error("Call next failed:", err);
      setActionError(err.message || "Failed to call next customer.");
    }
  };

  const handleAddCustomerClose = () => {
    setIsAddCustomerOpen(false);
    loadTokens();
  };

  // ---- Queue filter options ----
  const queueFilterOptions = [
    { value: "all", label: `All Queues (${queues.length})` },
    ...queues.map((q) => ({
      value: q.id,
      label: `${q.name} (${q.code})${(q.status || "").toLowerCase() === "inactive" ? " — Inactive" : ""}`,
    })),
  ];

  // ---- Render ----

  const isPageLoading = loading && allTokens.length === 0;

  // Determine whether to show actions on tokens
  const showActions = !isSelectedInactive;

  return (
    <div>
      {/* Header */}
      <PageHeader
        title="Token Management"
        subtitle="View and manage all customer tokens across your queues."
        showPreviewBadge={false}
        actions={
          <div style={{ display: "flex", gap: "0.625rem" }}>
            <button
              type="button"
              onClick={loadTokens}
              disabled={loading}
              className="btn btn-outline btn-sm"
              title="Refresh token data"
            >
              <RotateCcw size={14} className={loading ? "animate-spin" : ""} />
              <span>{loading ? "Refreshing..." : "Refresh"}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddCustomerOpen(true)}
              disabled={isOperating || isSelectedInactive}
              className="btn btn-primary"
              title={
                isSelectedInactive
                  ? "Cannot add customers to an inactive queue"
                  : "Issue a new customer token"
              }
            >
              <UserPlus size={15} />
              <span>Add Customer</span>
            </button>
          </div>
        }
      />

      {/* Action Error Banner */}
      {actionError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 1rem",
            backgroundColor: "var(--danger-subtle, #fee2e2)",
            color: "var(--danger, #dc2626)",
            border: "1px solid var(--danger-border, #fecaca)",
            borderRadius: "var(--radius-md, 8px)",
            fontSize: "0.875rem",
            marginBottom: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertCircle size={16} />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            style={{
              background: "none",
              border: "none",
              color: "var(--danger, #dc2626)",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.875rem",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Partial Load Warnings */}
      {partialErrors.length > 0 && !loadError && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            padding: "0.75rem 1rem",
            backgroundColor: "var(--warning-subtle, #fef3c7)",
            border: "1px solid var(--warning-border, #fde68a)",
            borderRadius: "var(--radius-md, 8px)",
            color: "var(--warning-text, #92400e)",
            fontSize: "0.8125rem",
            marginBottom: "1rem",
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Some queues could not be loaded:</strong>
            <ul style={{ margin: "0.25rem 0 0", paddingLeft: "1.25rem" }}>
              {partialErrors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Inactive Queue Banner */}
      {isSelectedInactive && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.875rem 1rem",
            backgroundColor: "var(--warning-subtle, #fef3c7)",
            border: "1px solid var(--warning-border, #fde68a)",
            borderRadius: "var(--radius-md, 8px)",
            color: "var(--warning-text, #92400e)",
            fontSize: "0.875rem",
            marginBottom: "1rem",
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <div>
            <strong>Queue is Inactive:</strong> This queue is currently paused.
            The backend does not serve token data for inactive queues. Reactivate
            it from the Queues page to view tokens and resume operations.
          </div>
        </div>
      )}

      {/* Filter Controls */}
      <div className="queues-top-bar">
        <div className="queue-kpi-summary">
          <div className="kpi-pill">
            <Ticket size={14} color="var(--primary)" />
            <span>Loaded:</span>
            <span className="kpi-pill-count">{allTokens.length}</span>
          </div>
          <div className="kpi-pill">
            <span>Waiting:</span>
            <span className="kpi-pill-count" style={{ color: "var(--warning)" }}>
              {waitingCount}
            </span>
          </div>
          <div className="kpi-pill">
            <span>Serving:</span>
            <span className="kpi-pill-count" style={{ color: "var(--primary)" }}>
              {servingCount}
            </span>
          </div>
          {displayedTokens.length !== allTokens.length && (
            <div className="kpi-pill">
              <span>Showing:</span>
              <span className="kpi-pill-count">{displayedTokens.length}</span>
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search name or token..."
          />
          <FilterDropdown
            value={queueFilter}
            onChange={setQueueFilter}
            options={queueFilterOptions}
          />
          <FilterDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
          />
        </div>
      </div>

      {/* All Queues — per-queue Call Next buttons */}
      {isAllQueuesView && queuesWithWaiting.length > 0 && !loading && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            padding: "0.75rem 1rem",
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-md, 8px)",
            marginBottom: "1rem",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginRight: "0.25rem",
            }}
          >
            Call Next:
          </span>
          {queuesWithWaiting.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => handleCallNextForQueue(q.id)}
              disabled={isOperating}
              className="btn btn-primary btn-sm"
              title={`Call next waiting customer in ${q.name}`}
            >
              <PhoneCall size={12} />
              <span>
                {q.name} ({queueWaitingCounts[q.id]} waiting)
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Content Area */}
      {isPageLoading ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "320px",
            gap: "1rem",
            backgroundColor: "var(--bg-surface)",
            borderRadius: "var(--radius-lg, 12px)",
            border: "1px solid var(--border-color)",
          }}
        >
          <div className="spinner" />
          <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Loading tokens from your queues...
          </span>
        </div>
      ) : isSelectedInactive ? (
        <EmptyState
          icon={AlertCircle}
          title="Queue is Inactive"
          description={`"${selectedQueue?.name || "This queue"}" is currently inactive. The backend does not serve token data for inactive queues. Reactivate it from the Queues page to view and manage tokens.`}
          actionText="View All Queues"
          onAction={() => setQueueFilter("all")}
        />
      ) : loadError ? (
        <EmptyState
          icon={AlertCircle}
          title="Unable to Load Tokens"
          description={loadError}
          actionText="Retry Loading"
          onAction={loadTokens}
        />
      ) : (
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            borderRadius: "var(--radius-lg, 12px)",
            border: "1px solid var(--border-color)",
            padding: "0.5rem",
          }}
        >
          <TokenTable
            tokens={displayedTokens}
            showQueueColumn={isAllQueuesView}
            itemsPerPage={15}
            onCall={
              isAllQueuesView
                ? undefined
                : showActions
                ? handleCallNextFromTable
                : undefined
            }
            onMoveUp={showActions ? handleMoveUp : undefined}
            onMoveDown={showActions ? handleMoveDown : undefined}
            onCancel={showActions ? handleCancelRequest : undefined}
          />
        </div>
      )}

      {/* Token limit notice */}
      {!loading && allTokens.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 0.75rem",
            marginTop: "0.75rem",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
          }}
        >
          <Info size={13} />
          <span>
            This page loads up to {TOKENS_PER_QUEUE_LIMIT} tokens per queue.
            Older tokens may not appear if the limit is reached.
          </span>
        </div>
      )}

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={handleAddCustomerClose}
        defaultQueueId={queueFilter !== "all" ? queueFilter : undefined}
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(cancellingToken)}
        onClose={() => setCancellingToken(null)}
        onConfirm={handleConfirmCancel}
        title="Cancel Customer Token"
        message={
          cancellingToken
            ? `Are you sure you want to cancel token #${cancellingToken.tokenNumber} for ${cancellingToken.customerName}? This action cannot be undone.`
            : "Are you sure you want to cancel this token?"
        }
        confirmText="Cancel Token"
        isDestructive={true}
        loading={isOperating}
      />
    </div>
  );
}
