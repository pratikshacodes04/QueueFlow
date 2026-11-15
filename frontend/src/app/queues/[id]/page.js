"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import TokenTable from "@/components/TokenTable";
import AddCustomerModal from "@/components/AddCustomerModal";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import EmptyState from "@/components/EmptyState";
import { useQueue } from "@/context/QueueContext";
import { getQueue, listTokens, getQueueTokenStats } from "@/services/api";
import {
  ArrowLeft,
  PhoneCall,
  UserPlus,
  CheckCircle,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

export default function QueueDetailsPage({ params }) {
  const { id } = params;
  const {
    callNextToken,
    completeCurrentToken,
    moveTokenUp,
    moveTokenDown,
    cancelToken,
    isOperating,
  } = useQueue();

  // Local state for queue details & tokens loaded directly from backend
  const [queue, setQueue] = useState(null);
  const [queueTokens, setQueueTokens] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorObj, setErrorObj] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Modal and action states
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [cancellingToken, setCancellingToken] = useState(null);
  const [callingState, setCallingState] = useState(false);
  const [completingState, setCompletingState] = useState(false);

  // Track active queue ID to prevent stale async responses
  const activeQueueIdRef = useRef(id);
  activeQueueIdRef.current = id;

  // Load queue information, token list, and statistics from real backend endpoints
  const loadQueueData = useCallback(async () => {
    setLoading(true);
    setErrorObj(null);
    setActionError(null);
    try {
      const qData = await getQueue(id);
      if (activeQueueIdRef.current !== id) return;

      const isInactive = (qData.status || "").toUpperCase() === "INACTIVE";

      let tokensList = [];
      let statsResult = null;

      if (isInactive) {
        // For inactive queues, fetch historical token list & statistics if backend supports it.
        // If rejected by backend, fall back gracefully to null without fabricating zeros.
        try {
          tokensList = await listTokens(id);
        } catch {
          tokensList = [];
        }
        try {
          statsResult = await getQueueTokenStats(id);
        } catch {
          statsResult = null;
        }
      } else {
        // For active queues, fetch real tokens and statistics concurrently.
        // Do not silently swallow errors or replace with empty arrays / fake zeros.
        const [fetchedTokens, fetchedStats] = await Promise.all([
          listTokens(id),
          getQueueTokenStats(id),
        ]);
        tokensList = fetchedTokens;
        statsResult = fetchedStats;
      }

      if (activeQueueIdRef.current !== id) return;

      setQueue(qData);
      setQueueTokens(tokensList || []);
      setStats(statsResult);
    } catch (err) {
      if (activeQueueIdRef.current !== id) return;
      console.error(`Failed to load queue data for ${id}:`, err);
      setErrorObj({
        message: err.message || "Failed to load queue details, token list, and statistics.",
        status: err.status || (err.message && err.message.includes("404") ? 404 : null),
      });
      setQueue(null);
      setQueueTokens([]);
      setStats(null);
    } finally {
      if (activeQueueIdRef.current === id) {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    loadQueueData();
  }, [loadQueueData]);

  // Status & Token partition
  const isInactive = (queue?.status || "").toUpperCase() === "INACTIVE";

  const waitingTokens = queueTokens
    .filter((t) => (t.status || "").toUpperCase() === "WAITING")
    .sort((a, b) => (a.position || 0) - (b.position || 0));

  const currentServingToken = queueTokens.find(
    (t) => (t.status || "").toUpperCase() === "SERVING"
  );

  // Action handlers wired to QueueContext methods with explicit error feedback
  const handleCallNext = async () => {
    if (
      isInactive ||
      Boolean(currentServingToken) ||
      waitingTokens.length === 0 ||
      callingState ||
      isOperating
    ) {
      return;
    }
    setCallingState(true);
    setActionError(null);
    try {
      await callNextToken(queue.id);
      await loadQueueData();
    } catch (err) {
      console.error("Failed to call next token:", err);
      setActionError(err.message || "Failed to call next customer.");
    } finally {
      setCallingState(false);
    }
  };

  const handleCompleteCurrent = async () => {
    if (!currentServingToken || completingState || isOperating) {
      return;
    }
    setCompletingState(true);
    setActionError(null);
    try {
      await completeCurrentToken(currentServingToken.id, queue.id);
      await loadQueueData();
    } catch (err) {
      console.error("Failed to complete service:", err);
      setActionError(err.message || "Failed to complete service.");
    } finally {
      setCompletingState(false);
    }
  };

  const handleMoveUp = async (tokenId) => {
    if (isInactive || isOperating) return;
    setActionError(null);
    try {
      await moveTokenUp(tokenId, queue.id);
      await loadQueueData();
    } catch (err) {
      console.error("Failed to move token up:", err);
      setActionError(err.message || "Failed to move token up.");
    }
  };

  const handleMoveDown = async (tokenId) => {
    if (isInactive || isOperating) return;
    setActionError(null);
    try {
      await moveTokenDown(tokenId, queue.id);
      await loadQueueData();
    } catch (err) {
      console.error("Failed to move token down:", err);
      setActionError(err.message || "Failed to move token down.");
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingToken || isOperating) return;
    setActionError(null);
    try {
      await cancelToken(cancellingToken.id, queue.id);
      await loadQueueData();
    } catch (err) {
      console.error("Failed to cancel token:", err);
      setActionError(err.message || "Failed to cancel ticket.");
    } finally {
      setCancellingToken(null);
    }
  };

  // ---------------- Loading View ----------------
  if (loading && !queue) {
    return (
      <div>
        <div style={{ marginBottom: "1rem" }}>
          <Link
            href="/queues"
            className="btn btn-outline btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
          >
            <ArrowLeft size={14} />
            <span>Back to All Queues</span>
          </Link>
        </div>
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
            Loading queue details and tokens from backend...
          </span>
        </div>
      </div>
    );
  }

  // ---------------- Error View: Distinguish 404 from other errors ----------------
  if (errorObj || !queue) {
    const isNotFound =
      errorObj?.status === 404 ||
      (errorObj?.message &&
        (errorObj.message.toLowerCase().includes("not found") ||
          errorObj.message.includes("404")));

    return (
      <div>
        <div style={{ marginBottom: "1rem" }}>
          <Link
            href="/queues"
            className="btn btn-outline btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
          >
            <ArrowLeft size={14} />
            <span>Back to All Queues</span>
          </Link>
        </div>
        <EmptyState
          icon={AlertCircle}
          title={isNotFound ? "Queue Not Found" : "Unable to Load Queue Data"}
          description={
            isNotFound
              ? `The service queue with identifier "${id}" does not exist or you do not have permission to view it.`
              : errorObj?.message || "A network or server error occurred while retrieving queue details."
          }
          actionText={isNotFound ? "View All Queues" : "Retry Loading"}
          onAction={() => {
            if (isNotFound) {
              window.location.assign("/queues");
            } else {
              loadQueueData();
            }
          }}
        />
      </div>
    );
  }

  // Format waiting tokens for the TokenTable component
  const formattedWaitingTokens = waitingTokens.map((t) => ({
    ...t,
    id: t.id,
    tokenNumber: t.token_number || t.tokenNumber,
    customerName: t.customer_name || t.customerName,
    customerEmail: t.customer_phone || t.customerEmail || "N/A",
    position: t.position,
    status: (t.status || "").toLowerCase(),
    rawStatus: t.status,
    arrivalTime: t.created_at
      ? new Date(t.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—",
  }));

  const canCallNext =
    !isInactive &&
    !Boolean(currentServingToken) &&
    waitingTokens.length > 0 &&
    !callingState &&
    !isOperating;

  const callNextDisabledReason = isInactive
    ? "Queue is inactive"
    : Boolean(currentServingToken)
    ? "Complete current service before calling next"
    : waitingTokens.length === 0
    ? "No waiting customers in line"
    : undefined;

  return (
    <div>
      {/* Back Link */}
      <div style={{ marginBottom: "1rem" }}>
        <Link
          href="/queues"
          className="btn btn-outline btn-sm"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
        >
          <ArrowLeft size={14} />
          <span>Back to All Queues</span>
        </Link>
      </div>

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

      {/* Inactive Queue Banner */}
      {isInactive && (
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
            marginBottom: "1.25rem",
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <div>
            <strong>Queue is Inactive:</strong> This queue is currently paused. You
            can review customer history, but adding customers, calling next tickets,
            and reordering are disabled until the queue is reactivated.
          </div>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title={queue.name}
        subtitle={`${queue.department || "Operations"} · ID: ${queue.id} · Code: ${queue.code || "—"}`}
        showPreviewBadge={false}
        actions={
          <div style={{ display: "flex", gap: "0.625rem" }}>
            <button
              type="button"
              onClick={loadQueueData}
              disabled={loading}
              className="btn btn-outline btn-sm"
              title="Refresh queue, tokens, and statistics"
            >
              <RotateCcw size={14} className={loading ? "animate-spin" : ""} />
              <span>{loading ? "Refreshing..." : "Refresh"}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddCustomerOpen(true)}
              disabled={isInactive || isOperating}
              className="btn btn-secondary"
              title={isInactive ? "Queue is inactive" : "Add customer to queue"}
            >
              <UserPlus size={15} />
              <span>Add Customer</span>
            </button>
            <button
              type="button"
              onClick={handleCallNext}
              disabled={!canCallNext}
              className="btn btn-primary"
              title={callNextDisabledReason || "Call next ticket to desk"}
            >
              <PhoneCall size={15} />
              <span>{callingState ? "Calling..." : "Call Next Token"}</span>
            </button>
          </div>
        }
      />

      {/* Summary KPI Strip */}
      <div className="stat-cards-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="stat-card">
          <span className="stat-label">Queue Status</span>
          <div style={{ marginTop: "0.5rem" }}>
            <StatusBadge status={queue.status} />
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-label">Total Customers</span>
          <div className="stat-value">{stats ? stats.TOTAL : "—"}</div>
        </div>

        <div className="stat-card">
          <span className="stat-label">Currently Waiting</span>
          <div className="stat-value" style={{ color: "var(--warning)" }}>
            {stats ? stats.WAITING : "—"}
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-label">Active Serving</span>
          <div className="stat-value" style={{ color: "var(--primary)" }}>
            {currentServingToken ? currentServingToken.token_number : "None"}
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-label">Completed</span>
          <div className="stat-value" style={{ color: "var(--success)" }}>
            {stats ? stats.COMPLETED : "—"}
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-label">Cancelled</span>
          <div className="stat-value" style={{ color: "var(--text-muted)" }}>
            {stats ? stats.CANCELLED : "—"}
          </div>
        </div>
      </div>

      {/* 2-Column Layout: Left = Current Serving Desk, Right = Waiting List */}
      <div className="queue-details-layout">
        {/* Left Column: Current Serving Counter */}
        <div className="current-serving-panel">
          <div className="serving-badge-header">
            <span
              style={{
                fontSize: "0.8125rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--text-muted)",
              }}
            >
              Desk Operator View
            </span>
            {currentServingToken && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontSize: "0.75rem",
                  color: "var(--info)",
                  fontWeight: 600,
                }}
              >
                <span className="pulse-indicator" /> Live Session
              </span>
            )}
          </div>

          <div className="serving-token-display">
            <span
              style={{
                fontSize: "0.6875rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--text-subtle)",
                fontWeight: 700,
              }}
            >
              Currently Serving Token
            </span>
            <div className="serving-token-num">
              {currentServingToken ? currentServingToken.token_number : "—"}
            </div>
            <div className="serving-customer-name">
              {currentServingToken?.customer_name ||
                "No active ticket being served"}
            </div>
          </div>

          <div className="serving-meta-list">
            <div className="serving-meta-row">
              <span className="serving-meta-label">Customer Contact</span>
              <span className="serving-meta-val" style={{ fontSize: "0.75rem" }}>
                {currentServingToken?.customer_phone || "N/A"}
              </span>
            </div>
            <div className="serving-meta-row">
              <span className="serving-meta-label">Session Start</span>
              <span className="serving-meta-val">
                {currentServingToken?.called_at
                  ? new Date(currentServingToken.called_at).toLocaleTimeString(
                      [],
                      { hour: "2-digit", minute: "2-digit" }
                    )
                  : "—"}
              </span>
            </div>
            <div className="serving-meta-row">
              <span className="serving-meta-label">Ticket Creation</span>
              <span className="serving-meta-val">
                {currentServingToken?.created_at
                  ? new Date(currentServingToken.created_at).toLocaleTimeString(
                      [],
                      { hour: "2-digit", minute: "2-digit" }
                    )
                  : "—"}
              </span>
            </div>
          </div>

          <div className="serving-actions-column">
            <button
              type="button"
              onClick={handleCompleteCurrent}
              disabled={
                completingState || !currentServingToken || isOperating
              }
              className="btn btn-primary"
              style={{ width: "100%", backgroundColor: "var(--success)" }}
            >
              <CheckCircle size={15} />
              <span>
                {completingState
                  ? "Completing..."
                  : "Complete Current Service"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleCallNext}
              disabled={!canCallNext}
              className="btn btn-secondary"
              style={{ width: "100%" }}
              title={callNextDisabledReason || "Call next ticket to desk"}
            >
              <PhoneCall size={15} />
              <span>{callingState ? "Calling..." : "Call Next Ticket"}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Waiting List & Management Table */}
        <div className="table-card">
          <div className="table-toolbar">
            <div>
              <h3
                style={{
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                Waiting Line ({waitingTokens.length})
              </h3>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  marginTop: "2px",
                }}
              >
                Live customer queue ordered by position. Use controls to adjust
                order or cancel tickets.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddCustomerOpen(true)}
              disabled={isInactive || isOperating}
              className="btn btn-outline btn-sm"
              title={isInactive ? "Queue is inactive" : "Add customer to line"}
            >
              <UserPlus size={13} />
              <span>Add Customer to Line</span>
            </button>
          </div>

          <TokenTable
            tokens={formattedWaitingTokens}
            showQueueColumn={false}
            onMoveUp={isInactive ? undefined : handleMoveUp}
            onMoveDown={isInactive ? undefined : handleMoveDown}
            onCancel={
              isInactive
                ? undefined
                : (tok) => setCancellingToken(tok)
            }
            onCall={
              canCallNext
                ? () => handleCallNext()
                : undefined
            }
          />
        </div>
      </div>

      {/* Add Customer Modal for this specific queue */}
      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => {
          setIsAddCustomerOpen(false);
          loadQueueData();
        }}
        defaultQueueId={queue.id}
      />

      {/* Cancel Confirmation Dialog for WAITING tokens */}
      <ConfirmationDialog
        isOpen={Boolean(cancellingToken)}
        onClose={() => setCancellingToken(null)}
        onConfirm={handleConfirmCancel}
        title="Cancel Customer Token"
        message={`Are you sure you want to cancel ticket #${
          cancellingToken?.token_number || cancellingToken?.tokenNumber
        } for ${
          cancellingToken?.customer_name || cancellingToken?.customerName
        }? This will remove them from the queue.`}
        confirmText="Cancel Ticket"
        isDestructive={true}
      />
    </div>
  );
}
