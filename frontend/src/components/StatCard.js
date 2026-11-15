import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function StatCard({
  label,
  value,
  icon: Icon,
  colorVariant = "blue",
  trend,
  subtitle,
}) {
  return (
    <div className="stat-card">
      <div>
        <div className="stat-card-top">
          <span className="stat-label">{label}</span>
          {Icon && (
            <div className={`stat-icon-wrapper stat-icon-${colorVariant}`}>
              <Icon size={18} />
            </div>
          )}
        </div>
        <div className="stat-value">{value}</div>
        {subtitle && <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)", marginTop: "2px" }}>{subtitle}</div>}
      </div>

      {trend && (
        <div
          className={`stat-trend ${
            trend.isPositive === true
              ? "trend-positive"
              : trend.isPositive === false
              ? "trend-negative"
              : "trend-neutral"
          }`}
        >
          {trend.isPositive === true && <TrendingUp size={14} />}
          {trend.isPositive === false && <TrendingDown size={14} />}
          {trend.isPositive === undefined && <Minus size={14} />}
          <span>{trend.value}</span>
          {trend.text && (
            <span style={{ color: "var(--text-subtle)", fontWeight: 400, marginLeft: "2px" }}>
              {trend.text}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

