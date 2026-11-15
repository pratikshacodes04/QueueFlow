"use client";

import React, { useState, useEffect } from "react";
import StatusBadge from "./StatusBadge";
import EmptyState from "./EmptyState";
import { ChevronUp, ChevronDown, XCircle, PhoneCall, Ticket } from "lucide-react";

export default function TokenTable({
  tokens = [],
  onMoveUp,
  onMoveDown,
  onCancel,
  onCall,
  showQueueColumn = true,
  itemsPerPage = 10,
}) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil((tokens?.length || 0) / itemsPerPage));

  // Ensure currentPage remains valid when token list changes
  useEffect(() => {
    setCurrentPage((prevPage) => {
      if (prevPage > totalPages) {
        return totalPages;
      }
      if (prevPage < 1) {
        return 1;
      }
      return prevPage;
    });
  }, [totalPages, tokens?.length]);

  if (!tokens || tokens.length === 0) {
    return (
      <EmptyState
        icon={Ticket}
        title="No Tokens Found"
        description="There are currently no customer tokens matching this view."
      />
    );
  }

  // Derive waiting tokens to determine lowest and highest waiting positions
  const waitingTokens = tokens.filter(
    (t) => (t.status || "").toLowerCase() === "waiting"
  );

  const minWaitingPosition =
    waitingTokens.length > 0
      ? Math.min(
          ...waitingTokens.map((t) =>
            typeof t.position === "number" ? t.position : Infinity
          )
        )
      : null;

  const maxWaitingPosition =
    waitingTokens.length > 0
      ? Math.max(
          ...waitingTokens.map((t) =>
            typeof t.position === "number" ? t.position : -Infinity
          )
        )
      : null;

  const firstWaitingToken =
    waitingTokens.length > 0
      ? waitingTokens.reduce((first, t) => {
          const tPos = typeof t.position === "number" ? t.position : Infinity;
          const firstPos = typeof first.position === "number" ? first.position : Infinity;
          return tPos < firstPos ? t : first;
        }, waitingTokens[0])
      : null;

  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validPage - 1) * itemsPerPage;
  const paginatedTokens = tokens.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="table-responsive-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: 60, textAlign: "center" }}>Pos</th>
            <th>Token</th>
            <th>Customer</th>
            {showQueueColumn && <th>Queue</th>}
            <th>Arrival</th>
            <th>Status</th>
            <th style={{ textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedTokens.map((token) => {
            const isWaiting = (token.status || "").toLowerCase() === "waiting";
            const isServing = (token.status || "").toLowerCase() === "serving";

            // Call Next only for the first waiting token by lowest position
            const isFirstWaiting =
              isWaiting &&
              Boolean(firstWaitingToken) &&
              (token.id ? token.id === firstWaitingToken.id : token.position === minWaitingPosition);

            // Move Down disabled for the last waiting token
            const isLastWaiting =
              isWaiting &&
              maxWaitingPosition !== null &&
              token.position >= maxWaitingPosition;

            return (
              <tr key={token.id}>
                <td style={{ textAlign: "center" }}>
                  {isWaiting ? (
                    <span
                      className={`position-badge ${
                        token.position === 1 ? "position-1" : ""
                      }`}
                    >
                      {token.position}
                    </span>
                  ) : isServing ? (
                    <span
                      className="status-badge status-badge-serving"
                      style={{ fontSize: "0.625rem", padding: "0.15rem 0.35rem" }}
                    >
                      Now
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-subtle)", fontSize: "0.75rem" }}>—</span>
                  )}
                </td>

                <td>
                  <span className="token-cell-code">{token.tokenNumber}</span>
                  {token.counter && (
                    <div style={{ fontSize: "0.6875rem", color: "var(--primary)" }}>
                      {token.counter}
                    </div>
                  )}
                </td>

                <td>
                  <div className="customer-cell-primary">{token.customerName}</div>
                  <div className="customer-cell-secondary">{token.customerEmail}</div>
                </td>

                {showQueueColumn && (
                  <td>
                    <span style={{ fontWeight: 500 }}>{token.queueName}</span>
                  </td>
                )}

                <td>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    {token.arrivalTime}
                  </span>
                </td>

                <td>
                  <StatusBadge status={token.status} />
                </td>

                <td>
                  <div className="table-actions-cell" style={{ justifyContent: "flex-end" }}>
                    {onCall && isFirstWaiting && (
                      <button
                        type="button"
                        onClick={() => onCall(token)}
                        className="btn btn-primary btn-sm"
                        title="Call next customer to desk"
                      >
                        <PhoneCall size={12} />
                        <span>Call Next</span>
                      </button>
                    )}

                    {onMoveUp && (
                      <button
                        type="button"
                        onClick={() => onMoveUp(token.id)}
                        disabled={!isWaiting || token.position <= 1}
                        className="btn btn-outline btn-sm"
                        title="Move Up in line"
                        style={{ padding: "0.35rem" }}
                      >
                        <ChevronUp size={14} />
                      </button>
                    )}

                    {onMoveDown && (
                      <button
                        type="button"
                        onClick={() => onMoveDown(token.id)}
                        disabled={!isWaiting || isLastWaiting}
                        className="btn btn-outline btn-sm"
                        title="Move Down in line"
                        style={{ padding: "0.35rem" }}
                      >
                        <ChevronDown size={14} />
                      </button>
                    )}

                    {onCancel && (
                      <button
                        type="button"
                        onClick={() => onCancel(token)}
                        disabled={!isWaiting}
                        className="btn btn-danger-outline btn-sm"
                        title="Cancel Token"
                        style={{ padding: "0.35rem" }}
                      >
                        <XCircle size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="table-pagination">
          <span>
            Showing {startIndex + 1} to{" "}
            {Math.min(startIndex + itemsPerPage, tokens.length)} of {tokens.length} tokens
          </span>
          <div className="pagination-controls">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validPage === 1}
            >
              Previous
            </button>
            <span style={{ padding: "0 0.5rem", fontWeight: 600 }}>
              {validPage} / {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


