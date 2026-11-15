import React from "react";

export function Skeleton({ width = "100%", height = "1rem", borderRadius, style }) {
  return (
    <div
      className="skeleton"
      style={{
        width,
        height,
        borderRadius: borderRadius || "var(--radius-xs)",
        ...style,
      }}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <Skeleton width="45%" height="0.875rem" />
        <Skeleton width="32px" height="32px" borderRadius="var(--radius-sm)" />
      </div>
      <Skeleton width="60%" height="1.75rem" style={{ margin: "0.5rem 0" }} />
      <Skeleton width="40%" height="0.75rem" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 6 }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i}>
          <Skeleton width={i === 0 ? "24px" : "80%"} height="1rem" />
        </td>
      ))}
    </tr>
  );
}

export function ChartSkeleton() {
  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div>
          <Skeleton width="180px" height="1.125rem" style={{ marginBottom: "0.25rem" }} />
          <Skeleton width="120px" height="0.75rem" />
        </div>
      </div>
      <Skeleton width="100%" height="240px" borderRadius="var(--radius-sm)" />
    </div>
  );
}

export default Skeleton;

