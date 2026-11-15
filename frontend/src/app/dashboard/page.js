"use client";

import React, { useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import ChartCard from "@/components/ChartCard";
import CreateQueueModal from "@/components/CreateQueueModal";
import AddCustomerModal from "@/components/AddCustomerModal";
import { useQueue } from "@/context/QueueContext";
import { useAuth } from "@/context/AuthContext";

import {
  Layers,
  Users,
  Clock,
  PhoneCall,
  CheckCircle2,
  Hourglass,
  Plus,
  ArrowRight,
  Ticket,
  BarChart3,
  UserCheck,
  Check,
  AlertTriangle,
} from "lucide-react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
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
} from "recharts";

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const { metrics, metricsLoading, metricsError, refetchMetrics, activities } = useQueue();
  const [isCreateQueueOpen, setIsCreateQueueOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);

  const managerName = user?.name ? user.name.split(" ")[0] : "Manager";

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="spinner" /> {/* Assume spinner CSS exists */}
      </div>
    );
  }

  if (metricsError) {
    return (
      <div className="p-4">
        <p className="text-red-600">Failed to load dashboard data: {metricsError}</p>
        <button onClick={refetchMetrics} className="btn btn-primary mt-2">Retry</button>
      </div>
    );
  }

  const chartData = metrics?.activity_timeline || [];

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        title={`Good morning, ${managerName}`}
        subtitle="Here's what's happening with your queues today."
        showPreviewBadge={false}
        badgeText="Preview Data"
        actions={
          <div style={{ display: "flex", gap: "0.625rem" }}>
            <button
              type="button"
              onClick={() => setIsAddCustomerOpen(true)}
              className="btn btn-secondary"
            >
              <Ticket size={15} />
              <span>Issue Token</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreateQueueOpen(true)}
              className="btn btn-primary"
            >
              <Plus size={16} />
              <span>Create Queue</span>
            </button>
          </div>
        }
      />

      {/* 6 Professional KPI Cards */}
      <div className="stat-cards-grid">
        {/* 1. Total Queues */}
        <StatCard
          label="Total Queues"
          value={metrics.totalQueues ?? "-"}
          icon={Layers}
          colorVariant="blue"
          trend={{ value: "+2", isPositive: true, text: "active departments" }}
          subtitle={`${metrics.activeQueues ?? "-"} active, ${metrics.inactiveQueues ?? "-"} paused`}
        />

        {/* 2. Total Customers Today */}
        <StatCard
          label="Total Customers Today"
          value={metrics.totalCustomersToday ?? "-"}
          icon={Users}
          colorVariant="violet"
          trend={{ value: "+14%", isPositive: true, text: "vs yesterday" }}
          subtitle="Cumulative daily traffic"
        />

        {/* 3. Currently Waiting */}
        <StatCard
          label="Currently Waiting"
          value={metrics.currentlyWaiting ?? "-"}
          icon={Hourglass}
          colorVariant="amber"
          trend={{ value: "-4", isPositive: true, text: "below peak load" }}
          subtitle="Across active service queues"
        />

        {/* 4. Currently Serving */}
        <StatCard
          label="Currently Serving"
          value={metrics.currentlyServing ?? "-"}
          icon={PhoneCall}
          colorVariant="blue"
          trend={{ value: "Optimal", text: "at service counters" }}
          subtitle="Tokens currently at desks"
        />

        {/* 5. Customers Served */}
        <StatCard
          label="Customers Served"
          value={metrics.customersServed ?? "-"}
          icon={CheckCircle2}
          colorVariant="emerald"
          trend={{ value: "+18%", isPositive: true, text: "efficiency pace" }}
          subtitle="Completed sessions"
        />

        {/* 6. Average Waiting Time */}
        <StatCard
          label="Avg Waiting Time"
          value={metrics.averageWaitingTime ?? "-"}
          icon={Clock}
          colorVariant="slate"
          trend={{ value: "-2.3m", isPositive: true, text: "faster than target" }}
          subtitle="Benchmark target: 15 min"
        />
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        {/* Chart 1: Queue Activity Over Time */}
        <ChartCard
          title="Queue Activity Over Time"
          subtitle="Hourly tokens issued vs. customer services completed"
          gridSpan={7}
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData.hourlyActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="issued" stroke="#3b82f6" dot={false} />
              <Line type="monotone" dataKey="completed" stroke="#10b981" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Quick Actions Card */}
        <div className="quick-actions-card">
          <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--text-primary)" }}>Quick Operations</h3>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>Common operational tasks and workflows</p>

          <div className="quick-actions-list">
            <button
              type="button"
              className="quick-action-btn"
              onClick={() => setIsCreateQueueOpen(true)}
            >
              <div className="quick-action-content">
                <div style={{ padding: "6px", borderRadius: "6px", backgroundColor: "var(--primary-subtle)", color: "var(--primary)" }}>
                  <Plus size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>Create Queue</div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>Open a new service desk</div>
                </div>
              </div>
              <ArrowRight size={14} color="var(--text-muted)" />
            </button>

            <Link href="/queues" className="quick-action-btn">
              <div className="quick-action-content">
                <div style={{ padding: "6px", borderRadius: "6px", backgroundColor: "var(--bg-surface-subtle)", color: "var(--text-secondary)" }}>
                  <Layers size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>View Queues</div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>Manage active desks</div>
                </div>
              </div>
              <ArrowRight size={14} color="var(--text-muted)" />
            </Link>

            <Link href="/tokens" className="quick-action-btn">
              <div className="quick-action-content">
                <div style={{ padding: "6px", borderRadius: "6px", backgroundColor: "var(--bg-surface-subtle)", color: "var(--text-secondary)" }}>
                  <Ticket size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>Manage Tokens</div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>Inspect &amp; reorder line</div>
                </div>
              </div>
              <ArrowRight size={14} color="var(--text-muted)" />
            </Link>

            <Link href="/analytics" className="quick-action-btn">
              <div className="quick-action-content">
                <div style={{ padding: "6px", borderRadius: "6px", backgroundColor: "var(--bg-surface-subtle)", color: "var(--text-secondary)" }}>
                  <BarChart3 size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>View Analytics</div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>Performance &amp; wait reports</div>
                </div>
              </div>
              <ArrowRight size={14} color="var(--text-muted)" />
            </Link>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateQueueModal
        isOpen={isCreateQueueOpen}
        onClose={() => setIsCreateQueueOpen(false)}
      />

      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
      />
    </div>
  );
}
