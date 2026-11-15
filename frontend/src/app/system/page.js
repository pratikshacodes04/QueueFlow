"use client";

import React from "react";
import StatusCard from "@/components/StatusCard";
import PageHeader from "@/components/PageHeader";
import { useHealth } from "@/hooks/useHealth";
import { formatLatency, formatTimestamp } from "@/utils/formatters";
import { API_ENDPOINTS } from "@/utils/constants";
import { RefreshCw, Server, Database, MonitorCheck } from "lucide-react";

export default function SystemStatusPage() {
  const { healthData, loading, error, refreshHealth } = useHealth();

  const isBackendHealthy = !loading && !error && healthData?.status === "healthy";
  const isBackendDegraded = !loading && !error && healthData?.status === "degraded";
  const isBackendError = Boolean(error);
  const dbConnected = healthData?.database?.connected;

  return (
    <div>
      <PageHeader
        title="System Architecture Status"
        subtitle="Live connection diagnostics for Next.js frontend, FastAPI backend services, and MongoDB datastore."
        badgeText="Live Diagnostics"
        actions={
          <button
            onClick={refreshHealth}
            disabled={loading}
            className="btn btn-outline"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Checking Status..." : "Refresh Health Check"}
          </button>
        }
      />

      <div className="status-grid">
        {/* Frontend Card */}
        <StatusCard
          title="Frontend Client"
          status="healthy"
          statusLabel="Online"
          description="Next.js App Router running with modern JavaScript and modular architecture."
          meta={[
            { label: "Host", value: "localhost:3000" },
            { label: "Framework", value: "Next.js 14 / React 18" },
            { label: "Router", value: "App Router (src/app)" },
          ]}
        />

        {/* Backend Card */}
        <StatusCard
          title="Backend API"
          status={
            loading
              ? "loading"
              : isBackendHealthy
              ? "healthy"
              : isBackendDegraded
              ? "degraded"
              : "error"
          }
          statusLabel={
            loading
              ? "Checking..."
              : isBackendHealthy
              ? "Healthy"
              : isBackendDegraded
              ? "Degraded (No DB)"
              : "Offline"
          }
          description="FastAPI service with modular controllers, routes, CORS, and logging."
          meta={[
            { label: "Endpoint", value: API_ENDPOINTS.baseUrl },
            {
              label: "API Status",
              value: loading ? "Probing..." : healthData?.status || "Unavailable",
            },
            {
              label: "Last Ping",
              value: formatTimestamp(healthData?.timestamp),
            },
          ]}
        />

        {/* Database Card */}
        <StatusCard
          title="Database"
          status={
            loading
              ? "loading"
              : dbConnected
              ? "connected"
              : "error"
          }
          statusLabel={
            loading
              ? "Checking..."
              : dbConnected
              ? "Connected"
              : "Disconnected"
          }
          description="MongoDB connection manager with error handling and health pings."
          meta={[
            {
              label: "Database",
              value: healthData?.database?.database || "queueflow_db",
            },
            {
              label: "Latency",
              value: formatLatency(healthData?.database?.latency_ms),
            },
            {
              label: "State",
              value: dbConnected ? "Active" : "Awaiting MongoDB instance",
            },
          ]}
        />
      </div>

      {/* Architectural Capabilities */}
      <section className="features-section" style={{ marginTop: "2rem" }}>
        <h3 className="section-title">Architectural Foundation</h3>
        <p className="section-desc">
          Clean, enterprise-ready separation of concerns designed for scaling queue workflows.
        </p>

        <div className="features-grid">
          <div className="feature-item">
            <h4 className="feature-title">App Router & Services</h4>
            <p className="feature-desc">
              Modular frontend structure separating UI components, API services, custom hooks, and shared state.
            </p>
          </div>
          <div className="feature-item">
            <h4 className="feature-title">FastAPI MVC Pattern</h4>
            <p className="feature-desc">
              Backend divided into decoupled routes, controllers, services, schemas, and database configuration.
            </p>
          </div>
          <div className="feature-item">
            <h4 className="feature-title">Error-Safe Database Manager</h4>
            <p className="feature-desc">
              PyMongo singleton lifecycle management preventing crashes even if database is temporarily offline.
            </p>
          </div>
          <div className="feature-item">
            <h4 className="feature-title">Production Environment Security</h4>
            <p className="feature-desc">
              Strict secret segregation using environment variables with zero hardcoded credentials.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

