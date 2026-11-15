import React from "react";

export default function StatusCard({
  title,
  status,
  statusLabel,
  description,
  meta = [],
}) {
  const getStatusClass = () => {
    switch (status) {
      case "healthy":
      case "connected":
      case "active":
        return "status-healthy";
      case "degraded":
      case "warning":
        return "status-degraded";
      default:
        return "status-error";
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
        <span className={`status-indicator ${getStatusClass()}`}>
          <span className="status-dot"></span>
          {statusLabel || status}
        </span>
      </div>
      <p className="card-body" style={{ marginBottom: "1rem" }}>
        {description}
      </p>
      {meta.length > 0 && (
        <div className="card-meta">
          {meta.map((item, index) => (
            <div key={index} className="meta-row">
              <span className="meta-label">{item.label}</span>
              <span className="meta-value">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

