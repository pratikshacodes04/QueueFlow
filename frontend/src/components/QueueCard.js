"use client";

import React from "react";
import Link from "next/link";
import StatusBadge from "./StatusBadge";
import { ArrowUpRight, Edit2, Power, Users, Clock, CheckCircle } from "lucide-react";

export default function QueueCard({
  queue,
  onEdit,
  onToggleStatus,
}) {
  const isActive = queue.status === "active";

  return (
    <div className="queue-card">
      <div>
        <div className="queue-card-header">
          <span className="queue-id-pill">{queue.id}</span>
          <StatusBadge status={queue.status} />
        </div>

        <h3 className="queue-card-title">{queue.name}</h3>
        <p className="queue-card-desc">{queue.description}</p>

        <div className="queue-metrics-box">
          <div className="queue-metric-col">
            <span className="queue-metric-label">Waiting</span>
            <span className="queue-metric-val" style={{ color: queue.waitingCount > 0 ? "var(--warning)" : "var(--text-muted)" }}>
              {queue.waitingCount}
            </span>
          </div>
          <div className="queue-metric-col">
            <span className="queue-metric-label">Serving</span>
            <span className="queue-metric-val" style={{ color: queue.currentServing !== "None" ? "var(--info)" : "var(--text-muted)", fontSize: "0.9375rem" }}>
              {queue.currentServing}
            </span>
          </div>
          <div className="queue-metric-col">
            <span className="queue-metric-label">Served</span>
            <span className="queue-metric-val" style={{ color: "var(--success)" }}>
              {queue.totalServed}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <Clock size={13} /> Avg ~{queue.avgWaitMinutes || 8} min
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <CheckCircle size={13} /> Code: {queue.code}
          </span>
        </div>
      </div>

      <div className="queue-card-footer">
        <span className="queue-date">Est. {queue.createdAt}</span>

        <div className="queue-actions-row">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(queue)}
              className="btn btn-outline btn-sm"
              title="Edit Queue details"
            >
              <Edit2 size={13} /> Edit
            </button>
          )}

          {onToggleStatus && (
            <button
              type="button"
              onClick={() => onToggleStatus(queue)}
              className={`btn btn-sm ${isActive ? "btn-outline" : "btn-primary"}`}
              title={isActive ? "Deactivate Queue" : "Activate Queue"}
              style={isActive ? { color: "var(--text-secondary)" } : {}}
            >
              <Power size={13} /> {isActive ? "Deactivate" : "Activate"}
            </button>
          )}

          <Link href={`/queues/${queue.id}`} className="btn btn-primary btn-sm">
            <span>View</span>
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}

