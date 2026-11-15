"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Layers,
  Users,
  Hourglass,
  PhoneCall,
  CheckCircle2,
  XCircle,
  Clock,
  Timer,
  RotateCcw,
  AlertCircle,
  Info,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import { StatCardSkeleton, ChartSkeleton } from "@/components/LoadingSkeleton";
import { getAnalyticsOverview } from "@/services/api";

/**
 * Analytics page — all numbers come from GET /analytics/overview.
 *
 * Backend semantics (see backend/services/analytics_service.py):
 *  - Everything is scoped to the authenticated manager.
 *  - "Waiting now" / "Serving now" are live snapshots (not timeframe-limited).
 *  - Total / Completed / Cancelled / status distribution / queue volume are
 *    computed over tokens CREATED inside the timeframe.
 *  - Day boundaries and "today" are UTC (timestamps are stored as UTC ISO).
 */

const TIMEFRAME_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

// Hex values mirror the design-system tokens (Recharts needs concrete colors).
const STATUS_META = {
  WAITING: { label: "Waiting", color: "#f59e0b" },
  SERVING: { label: "Serving", color: "#3b82f6" },
  COMPLETED: { label: "Completed", color: "#10b981" },
  CANCELLED: { label: "Cancelled", color: "#94a3b8" },
};

const CHART_GRID = "#e2e8f0";
const AXIS_TICK = { fontSize: 12, fill: "#64748b" };
const TOOLTIP_STYLE = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  fontSize: 12,
};

function formatMinutes(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  const v = Number(value);
  if (v < 1) return `${Math.round(v * 60)} sec`;
  if (v < 60) return `${Number(v.toFixed(1))} min`;
  const h = Math.floor(v / 60);
  const m = Math.round(v % 60);
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

// Backend dates are UTC calendar days (YYYY-MM-DD). Format them in UTC so the
// label never shifts by a day in the viewer's local timezone.
function formatUtcDate(dateStr, withYear = false) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

function describeError(err) {
  if (err?.status === 401) {
    return "You are not signed in, or your session has expired. Sign in again to view analytics.";
  }
  if (err?.status === 403) {
    return "This account is not allowed to view analytics.";
  }
  if (err?.status === 408) {
    return "The server took too long to respond. Check that the backend is running and try again.";
  }
  if (err?.name === "TypeError") {
    return "Could not reach the backend. Check that the API server is running and try again.";
  }
  return err?.message || "Failed to load analytics data.";
}

function ChartPanel({ title, subtitle, children }) {
  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div className="chart-title-group">
          <h3 className="chart-title">{title}</h3>
          {subtitle && <p className="chart-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="chart-container-inner">{children}</div>
    </div>
  );
}

function ChartEmpty({ children }) {
  return <div className="analytics-chart-empty">{children}</div>;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [timeframe, setTimeframe] = useState("7d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Ignore responses from superseded requests (fast timeframe switching).
  const requestRef = useRef(0);

  const loadAnalytics = useCallback(async (tf) => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await getAnalyticsOverview(tf);
      if (requestId !== requestRef.current) return;
      if (!result || !result.kpis) {
        throw new Error("The analytics response was missing expected data.");
      }
      setData(result);
    } catch (err) {
      if (requestId !== requestRef.current) return;
      console.error("Analytics load error:", err);
      // Never keep old numbers on screen as if they were current.
      setData(null);
      setError(describeError(err));
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics(timeframe);
    return () => {
      requestRef.current += 1; // invalidate in-flight request on change/unmount
    };
  }, [timeframe, loadAnalytics]);

  const kpis = data?.kpis;
  const timeline = data?.activity_timeline || [];
  const statusDistribution = data?.status_distribution || [];
  const queueVolume = [...(data?.queue_volume || [])].sort(
    (a, b) => b.token_count - a.token_count
  );

  const pieData = statusDistribution
    .filter((s) => s.count > 0 && STATUS_META[s.status])
    .map((s) => ({ ...s, name: STATUS_META[s.status].label }));

  const hasTokens = (kpis?.total_tokens ?? 0) > 0;
  const hasQueues = (kpis?.total_queues ?? 0) > 0;
  const timeframeLabel =
    TIMEFRAME_OPTIONS.find((o) => o.value === data?.timeframe)?.label || "";

  let rangeText = "";
  if (timeline.length > 0) {
    const first = timeline[0].date;
    const last = timeline[timeline.length - 1].date;
    rangeText =
      first === last
        ? formatUtcDate(first, true)
        : `${formatUtcDate(first)} – ${formatUtcDate(last, true)}`;
  }

  const queueChartHeight = Math.max(220, queueVolume.length * 38 + 40);
  const showSkeleton = loading && !data && !error;

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Queue performance and token activity for your queues."
        showPreviewBadge={false}
        actions={
          <div className="analytics-actions">
            <div className="analytics-tf-group" role="group" aria-label="Timeframe">
              {TIMEFRAME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTimeframe(opt.value)}
                  aria-pressed={timeframe === opt.value}
                  className={`btn btn-sm ${
                    timeframe === opt.value ? "btn-primary" : "btn-outline"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => loadAnalytics(timeframe)}
              disabled={loading}
              className="btn btn-outline btn-sm"
              title="Reload analytics"
            >
              <RotateCcw size={14} className={loading ? "analytics-spin" : ""} />
              <span>{loading ? "Loading..." : "Refresh"}</span>
            </button>
          </div>
        }
      />

      {/* Initial loading */}
      {showSkeleton && (
        <div aria-busy="true" aria-live="polite">
          <div className="stat-cards-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="analytics-chart-grid">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </div>
      )}

      {/* Error — no numbers are shown, only the error and a retry */}
      {error && !loading && (
        <div className="analytics-state-card" role="alert">
          <EmptyState
            icon={AlertCircle}
            title="Unable to load analytics"
            description={error}
            actionText="Retry"
            onAction={() => loadAnalytics(timeframe)}
          />
        </div>
      )}

      {/* No queues at all */}
      {data && !error && !hasQueues && (
        <div className="analytics-state-card">
          <EmptyState
            title="No queues yet"
            description="Create a queue and issue some tokens — analytics will appear here once there is activity."
            actionText="Go to My Queues"
            onAction={() => router.push("/queues")}
          />
        </div>
      )}

      {/* Content */}
      {data && !error && hasQueues && (
        <div className="analytics-body" aria-busy={loading} data-loading={loading}>
          <div className="analytics-range">
            <Info size={14} />
            <span>
              <strong>{timeframeLabel}</strong>
              {rangeText && <> · {rangeText} (UTC days)</>}
              {loading && <> · updating…</>}
            </span>
          </div>

          <div className="stat-cards-grid">
            <StatCard
              label="Total Tokens"
              value={kpis.total_tokens}
              icon={Users}
              colorVariant="violet"
              subtitle="Created in this period"
            />
            <StatCard
              label="Waiting Now"
              value={kpis.currently_waiting}
              icon={Hourglass}
              colorVariant="amber"
              subtitle="Live, all queues"
            />
            <StatCard
              label="Serving Now"
              value={kpis.currently_serving}
              icon={PhoneCall}
              colorVariant="blue"
              subtitle="Live, all queues"
            />
            <StatCard
              label="Completed"
              value={kpis.completed}
              icon={CheckCircle2}
              colorVariant="emerald"
              subtitle="Of tokens created in this period"
            />
            <StatCard
              label="Cancelled"
              value={kpis.cancelled}
              icon={XCircle}
              colorVariant="slate"
              subtitle="Of tokens created in this period"
            />
            <StatCard
              label="Avg Waiting Time"
              value={formatMinutes(kpis.avg_wait_minutes)}
              icon={Clock}
              colorVariant="amber"
              subtitle={
                kpis.avg_wait_minutes == null
                  ? "No called tokens in this period"
                  : "Created → called"
              }
            />
            <StatCard
              label="Avg Service Time"
              value={formatMinutes(kpis.avg_service_minutes)}
              icon={Timer}
              colorVariant="emerald"
              subtitle={
                kpis.avg_service_minutes == null
                  ? "No completed tokens in this period"
                  : "Called → completed"
              }
            />
            <StatCard
              label="Total Queues"
              value={kpis.total_queues}
              icon={Layers}
              colorVariant="blue"
              subtitle="Owned by you"
            />
          </div>

          {!hasTokens && (
            <div className="analytics-note">
              <Info size={14} />
              <span>
                No tokens were created in this timeframe. Try a longer range, or issue
                tokens from a queue.
              </span>
            </div>
          )}

          {/* Daily activity */}
          <ChartPanel
            title="Daily Queue Activity"
            subtitle="Tokens created per day, and how many of those were completed (UTC days)"
          >
            {hasTokens && timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={timeline} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => formatUtcDate(d)}
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={16}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={(d) => formatUtcDate(d, true)}
                    cursor={{ fill: "rgba(148,163,184,0.12)" }}
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="created" name="Created" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty>No token activity in this timeframe.</ChartEmpty>
            )}
          </ChartPanel>

          <div className="analytics-chart-grid">
            {/* Status distribution */}
            <ChartPanel
              title="Token Status Distribution"
              subtitle="Current status of tokens created in this period"
            >
              {pieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={230}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={86}
                        paddingAngle={2}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.status} fill={STATUS_META[entry.status].color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="analytics-legend">
                    {statusDistribution
                      .filter((s) => STATUS_META[s.status])
                      .map((s) => (
                        <div key={s.status} className="analytics-legend-item">
                          <span
                            className="analytics-legend-dot"
                            style={{ backgroundColor: STATUS_META[s.status].color }}
                          />
                          <span>{STATUS_META[s.status].label}</span>
                          <strong>{s.count}</strong>
                        </div>
                      ))}
                  </div>
                </>
              ) : (
                <ChartEmpty>No tokens in this timeframe.</ChartEmpty>
              )}
            </ChartPanel>

            {/* Queue volume */}
            <ChartPanel
              title="Token Volume by Queue"
              subtitle="Tokens created in this period, per queue"
            >
              {hasTokens && queueVolume.length > 0 ? (
                <ResponsiveContainer width="100%" height={queueChartHeight}>
                  <BarChart
                    data={queueVolume}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="queue_name"
                      width={110}
                      tick={{ fontSize: 11, fill: "#475569" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      cursor={{ fill: "rgba(148,163,184,0.12)" }}
                      formatter={(value) => [value, "Tokens"]}
                      labelFormatter={(name, payload) => {
                        const code = payload?.[0]?.payload?.queue_code;
                        return code ? `${name} (${code})` : name;
                      }}
                    />
                    <Bar dataKey="token_count" name="Tokens" fill="#2563eb" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmpty>No token volume in this timeframe.</ChartEmpty>
              )}
            </ChartPanel>
          </div>

          <p className="analytics-footnote">
            Waiting Now and Serving Now are live counts. All other figures cover tokens created
            during the selected period. &ldquo;Today&rdquo; and daily buckets use UTC, matching
            the server. Average times only include tokens that have the required timestamps.
          </p>
        </div>
      )}
    </div>
  );
}
