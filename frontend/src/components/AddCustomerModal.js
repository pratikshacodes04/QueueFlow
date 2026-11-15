"use client";

import React, { useState } from "react";
import Modal from "./Modal";
import { useQueue } from "@/context/QueueContext";

export default function AddCustomerModal({ isOpen, onClose, defaultQueueId }) {
  const { queues, addCustomerToken } = useQueue();

  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    queueId: defaultQueueId || (queues[0] ? queues[0].id : ""),
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const selectedQueueId = formData.queueId || defaultQueueId || (queues[0] ? queues[0].id : "");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name] || errors.submit) {
      setErrors((prev) => ({ ...prev, [name]: null, submit: null }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.customerName.trim()) {
      errs.customerName = "Customer name is required";
    }
    if (!selectedQueueId) {
      errs.queueId = "Please select a queue";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    setErrors((prev) => ({ ...prev, submit: null }));

    try {
      await addCustomerToken(selectedQueueId, {
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
      });

      // Reset and close only on confirmed success
      setFormData({
        customerName: "",
        customerPhone: "",
        queueId: defaultQueueId || (queues[0] ? queues[0].id : ""),
      });
      setErrors({});
      onClose();
    } catch (err) {
      console.error("Failed to add customer:", err);
      // Keep modal open, preserve entered values, and display understandable error
      setErrors((prev) => ({
        ...prev,
        submit: err.message || "Failed to issue ticket. Please check connection and try again.",
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        disabled={submitting}
        className="btn btn-secondary"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="btn btn-primary"
      >
        {submitting ? "Issuing Token..." : "Issue Token"}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? undefined : onClose}
      title="Issue Customer Ticket / Token"
      footer={footer}
      maxWidth="480px"
    >
      <form onSubmit={handleSubmit}>
        {errors.submit && (
          <div
            style={{
              padding: "0.625rem 0.75rem",
              backgroundColor: "var(--danger-subtle, #fee2e2)",
              color: "var(--danger, #dc2626)",
              border: "1px solid var(--danger-border, #fecaca)",
              borderRadius: "var(--radius-sm, 6px)",
              fontSize: "0.8125rem",
              marginBottom: "1rem",
            }}
          >
            {errors.submit}
          </div>
        )}

        <div className="form-group">
          <label className="form-label form-label-required">Select Queue</label>
          <select
            name="queueId"
            className={`form-select ${errors.queueId ? "has-error" : ""}`}
            value={selectedQueueId}
            onChange={handleChange}
            disabled={Boolean(defaultQueueId) || submitting}
          >
            {queues
              .filter((q) => q.status === "active" || q.id === defaultQueueId)
              .map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name} ({q.code}) — {q.waitingCount ?? 0} waiting
                </option>
              ))}
          </select>
          {errors.queueId && <span className="form-error-msg">{errors.queueId}</span>}
        </div>

        <div className="form-group">
          <label className="form-label form-label-required">Customer Full Name</label>
          <input
            type="text"
            name="customerName"
            className={`form-input ${errors.customerName ? "has-error" : ""}`}
            placeholder="e.g. Eleanor Rigby"
            value={formData.customerName}
            onChange={handleChange}
            disabled={submitting}
            autoFocus
          />
          {errors.customerName && (
            <span className="form-error-msg">{errors.customerName}</span>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Phone Number (Optional)</label>
          <input
            type="text"
            name="customerPhone"
            className="form-input"
            placeholder="e.g. +1 555-0199"
            value={formData.customerPhone}
            onChange={handleChange}
            disabled={submitting}
          />
          <span className="form-hint">Contact number for customer record and verification.</span>
        </div>


      </form>
    </Modal>
  );
}
