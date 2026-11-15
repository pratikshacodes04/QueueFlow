import React from "react";

export default function StatusBadge({ status, label }) {
  const normalizedStatus = (status || "").toLowerCase();

  let badgeClass = "status-badge-inactive";
  let displayLabel = label || status;

  switch (normalizedStatus) {
    case "waiting":
      badgeClass = "status-badge-waiting";
      displayLabel = label || "Waiting";
      break;
    case "serving":
    case "in-progress":
      badgeClass = "status-badge-serving";
      displayLabel = label || "Serving";
      break;
    case "completed":
    case "served":
      badgeClass = "status-badge-completed";
      displayLabel = label || "Completed";
      break;
    case "cancelled":
    case "canceled":
      badgeClass = "status-badge-cancelled";
      displayLabel = label || "Cancelled";
      break;
    case "active":
      badgeClass = "status-badge-active";
      displayLabel = label || "Active";
      break;
    case "inactive":
    case "paused":
      badgeClass = "status-badge-inactive";
      displayLabel = label || "Inactive";
      break;
    default:
      badgeClass = "status-badge-inactive";
      displayLabel = label || status;
  }

  return (
    <span className={`status-badge ${badgeClass}`}>
      <span className="badge-dot" />
      <span>{displayLabel}</span>
    </span>
  );
}

