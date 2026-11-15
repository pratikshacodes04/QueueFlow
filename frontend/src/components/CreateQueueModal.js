"use client";

import React, { useState } from "react";
import Modal from "./Modal";
import { useQueue } from "@/context/QueueContext";

export default function CreateQueueModal({ isOpen, onClose }) {
  const { addQueue } = useQueue();

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    department: "Customer Experience",
    description: "",
    estimatedServiceTime: 5,
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = "Queue name is required";
    } else if (formData.name.trim().length < 3) {
      errs.name = "Queue name must be at least 3 characters";
    }

    if (formData.code.trim() && formData.code.trim().length > 6) {
      errs.code = "Queue prefix code should not exceed 6 characters";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setTimeout(() => {
      addQueue(formData);
      setSubmitting(false);
      setFormData({
        name: "",
        code: "",
        department: "Customer Experience",
        description: "",
        estimatedServiceTime: 5,
      });
      onClose();
    }, 200);
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
        {submitting ? "Creating Queue..." : "Create Queue"}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Service Queue"
      footer={footer}
      maxWidth="520px"
    >
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label form-label-required">Queue Name</label>
          <input
            type="text"
            name="name"
            className={`form-input ${errors.name ? "has-error" : ""}`}
            placeholder="e.g. VIP Consultation Desk"
            value={formData.name}
            onChange={handleChange}
            autoFocus
          />
          {errors.name ? (
            <span className="form-error-msg">{errors.name}</span>
          ) : (
            <span className="form-hint">Displayed to staff and customer ticket displays.</span>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="form-group">
            <label className="form-label">Code Prefix (Optional)</label>
            <input
              type="text"
              name="code"
              className={`form-input ${errors.code ? "has-error" : ""}`}
              placeholder="e.g. VIP"
              value={formData.code}
              onChange={handleChange}
              maxLength={6}
            />
            {errors.code ? (
              <span className="form-error-msg">{errors.code}</span>
            ) : (
              <span className="form-hint">Defaults to first letters of name.</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Department</label>
            <select
              name="department"
              className="form-select"
              value={formData.department}
              onChange={handleChange}
            >
              <option value="Customer Experience">Customer Experience</option>
              <option value="IT & Systems">IT & Systems</option>
              <option value="Finance & Claims">Finance & Claims</option>
              <option value="Operations">Operations</option>
              <option value="Executive Services">Executive Services</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Estimated Service Time (Minutes)</label>
          <input
            type="number"
            name="estimatedServiceTime"
            className="form-input"
            min="1"
            max="120"
            value={formData.estimatedServiceTime}
            onChange={handleChange}
          />
          <span className="form-hint">Used to calculate automated customer wait time estimates.</span>
        </div>

        <div className="form-group">
          <label className="form-label">Description (Optional)</label>
          <textarea
            name="description"
            rows="3"
            className="form-textarea"
            placeholder="Purpose of this queue, service capabilities, or notes for counter officers..."
            value={formData.description}
            onChange={handleChange}
          />
        </div>
      </form>
    </Modal>
  );
}

