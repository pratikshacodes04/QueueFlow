"use client";

import React, { useState } from "react";
import PageHeader from "@/components/PageHeader";
import QueueCard from "@/components/QueueCard";
import CreateQueueModal from "@/components/CreateQueueModal";
import Modal from "@/components/Modal";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import SearchInput from "@/components/SearchInput";
import FilterDropdown from "@/components/FilterDropdown";
import EmptyState from "@/components/EmptyState";
import { useQueue } from "@/context/QueueContext";
import { Plus, Layers, CheckCircle2, PauseCircle, Search } from "lucide-react";

export default function QueuesPage() {
  const { queues, updateQueue, toggleQueueStatus } = useQueue();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Edit Modal State
  const [editingQueue, setEditingQueue] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", estimatedServiceTime: 5 });

  // Confirmation for Deactivation
  const [confirmToggleQueue, setConfirmToggleQueue] = useState(null);

  // Filter queues
  const filteredQueues = queues.filter((q) => {
    const matchesSearch =
      q.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && q.status === "active") ||
      (statusFilter === "inactive" && q.status === "inactive");

    return matchesSearch && matchesStatus;
  });

  const totalCount = queues.length;
  const activeCount = queues.filter((q) => q.status === "active").length;
  const inactiveCount = queues.filter((q) => q.status === "inactive").length;

  const handleOpenEdit = (queue) => {
    setEditingQueue(queue);
    setEditForm({
      name: queue.name,
      description: queue.description || "",
      estimatedServiceTime: queue.estimatedServiceTime || 5,
    });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingQueue) return;
    updateQueue(editingQueue.id, {
      name: editForm.name,
      description: editForm.description,
      estimatedServiceTime: Number(editForm.estimatedServiceTime),
    });
    setEditingQueue(null);
  };

  const handleConfirmToggle = () => {
    if (confirmToggleQueue) {
      toggleQueueStatus(confirmToggleQueue.id);
      setConfirmToggleQueue(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <PageHeader
        title="My Queues"
        subtitle="Create and manage all your service queues."
        showPreviewBadge={true}
        badgeText="Preview Data"
        actions={
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="btn btn-primary"
          >
            <Plus size={16} />
            <span>Create Queue</span>
          </button>
        }
      />

      {/* Top Summary Bar with KPI Pills & Filter Controls */}
      <div className="queues-top-bar">
        <div className="queue-kpi-summary">
          <div className="kpi-pill">
            <Layers size={14} color="var(--primary)" />
            <span>Total Queues:</span>
            <span className="kpi-pill-count">{totalCount}</span>
          </div>
          <div className="kpi-pill">
            <CheckCircle2 size={14} color="var(--success)" />
            <span>Active:</span>
            <span className="kpi-pill-count" style={{ color: "var(--success)" }}>
              {activeCount}
            </span>
          </div>
          <div className="kpi-pill">
            <PauseCircle size={14} color="var(--text-muted)" />
            <span>Inactive:</span>
            <span className="kpi-pill-count" style={{ color: "var(--text-muted)" }}>
              {inactiveCount}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search queues by name or code..."
          />

          <FilterDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "All Statuses" },
              { value: "active", label: "Active Queues Only" },
              { value: "inactive", label: "Inactive Queues Only" },
            ]}
          />
        </div>
      </div>

      {/* Queues Responsive Grid */}
      {filteredQueues.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No Queues Found"
          description={
            searchQuery || statusFilter !== "all"
              ? "No service queues match your current filter criteria."
              : "No queues have been created yet. Launch your first service desk below."
          }
          actionText={searchQuery ? "Clear Search" : "Create Queue"}
          onAction={() => {
            if (searchQuery) {
              setSearchQuery("");
              setStatusFilter("all");
            } else {
              setIsCreateOpen(true);
            }
          }}
        />
      ) : (
        <div className="queues-grid">
          {filteredQueues.map((queue) => (
            <QueueCard
              key={queue.id}
              queue={queue}
              onEdit={handleOpenEdit}
              onToggleStatus={(q) => setConfirmToggleQueue(q)}
            />
          ))}
        </div>
      )}

      {/* Create Queue Modal */}
      <CreateQueueModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      {/* Edit Queue Modal */}
      <Modal
        isOpen={Boolean(editingQueue)}
        onClose={() => setEditingQueue(null)}
        title={`Edit Queue: ${editingQueue?.name}`}
        maxWidth="500px"
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditingQueue(null)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              className="btn btn-primary"
            >
              Save Changes
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveEdit}>
          <div className="form-group">
            <label className="form-label form-label-required">Queue Name</label>
            <input
              type="text"
              className="form-input"
              value={editForm.name}
              onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Estimated Service Time (Minutes)</label>
            <input
              type="number"
              className="form-input"
              min="1"
              max="120"
              value={editForm.estimatedServiceTime}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, estimatedServiceTime: e.target.value }))
              }
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              rows="3"
              className="form-textarea"
              value={editForm.description}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          </div>
        </form>
      </Modal>

      {/* Toggle Status Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(confirmToggleQueue)}
        onClose={() => setConfirmToggleQueue(null)}
        onConfirm={handleConfirmToggle}
        title={`${
          confirmToggleQueue?.status === "active" ? "Deactivate" : "Activate"
        } Queue?`}
        message={
          confirmToggleQueue?.status === "active"
            ? `Deactivating "${confirmToggleQueue?.name}" will temporarily pause token calls for this desk. Existing waiting tickets will be preserved.`
            : `Activating "${confirmToggleQueue?.name}" will resume accepting tickets and allow calling next tokens.`
        }
        confirmText={
          confirmToggleQueue?.status === "active" ? "Deactivate Queue" : "Activate Queue"
        }
        isDestructive={confirmToggleQueue?.status === "active"}
      />
    </div>
  );
}

