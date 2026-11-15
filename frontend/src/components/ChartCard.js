import React from "react";

export default function ChartCard({
  title,
  subtitle,
  children,
  actions,
  gridSpan = 6,
}) {
  return (
    <div className="chart-card" style={{ gridColumn: `span ${gridSpan}` }}>
      <div className="chart-card-header">
        <div className="chart-title-group">
          <h3 className="chart-title">{title}</h3>
          {subtitle && <p className="chart-subtitle">{subtitle}</p>}
        </div>
        {actions && <div>{actions}</div>}
      </div>
      <div className="chart-container-inner">{children}</div>
    </div>
  );
}

