"use client";

import React from "react";
import Modal from "./Modal";
import { AlertTriangle, Info } from "lucide-react";

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
  loading = false,
}) {
  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        disabled={loading}
        className="btn btn-secondary"
      >
        {cancelText}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={loading}
        className={`btn ${isDestructive ? "btn-danger" : "btn-primary"}`}
      >
        {loading ? "Processing..." : confirmText}
      </button>
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} footer={footer} maxWidth="440px">
      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "var(--radius-full)",
            backgroundColor: isDestructive ? "var(--danger-bg)" : "var(--primary-subtle)",
            color: isDestructive ? "var(--danger)" : "var(--primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {isDestructive ? <AlertTriangle size={20} /> : <Info size={20} />}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {message}
          </p>
        </div>
      </div>
    </Modal>
  );
}

